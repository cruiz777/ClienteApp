import {
  Component,
  Injectable,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  MatSnackBar
} from '@angular/material/snack-bar';

import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatDateFormats,
  NativeDateAdapter
} from '@angular/material/core';

import {
  Subject
} from 'rxjs';

import {
  debounceTime,
  distinctUntilChanged,
  takeUntil
} from 'rxjs/operators';

import {
  CellClickedEvent,
  CellValueChangedEvent,
  ColDef,
  ICellRendererParams
} from 'ag-grid-community';

import {
  EmpleadoBusquedaResponse,
  EmpleadoFichaService
} from 'src/app/services/rol/empleado-ficha.service';

import {
  CalcularLiquidacionRequest,
  LiquidacionCalculoResponse,
  LiquidacionDetalleResponse,
  LiquidacionEmpleadoService
} from 'src/app/services/rol/liquidacion-empleado.service';


// ============================================================
// MODELO LOCAL GRID
// ============================================================

type LiquidacionDetalleGrid =
  LiquidacionDetalleResponse & {

    esManual?: boolean;

    uid?: string;
  };


// ============================================================
// DATE ADAPTER
// ============================================================

@Injectable()
export class LiquidacionDateAdapter
  extends NativeDateAdapter {

  override format(
    date: Date,
    displayFormat: Object
  ): string {

    if (!date) {
      return '';
    }


    // ========================================================
    // INPUT dd/MM/yyyy
    // ========================================================

    if (
      displayFormat === 'input'
    ) {

      const dia =
        String(
          date.getDate()
        ).padStart(
          2,
          '0'
        );


      const mes =
        String(
          date.getMonth() + 1
        ).padStart(
          2,
          '0'
        );


      const anio =
        date.getFullYear();


      return `${dia}/${mes}/${anio}`;
    }


    // ========================================================
    // CABECERA CALENDARIO
    // ========================================================

    if (
      displayFormat === 'monthYear'
    ) {

      return new Intl.DateTimeFormat(
        'es-EC',
        {
          month: 'long',
          year: 'numeric'
        }
      ).format(
        date
      );
    }


    return super.format(
      date,
      displayFormat
    );
  }


  // ==========================================================
  // PARSE
  // ==========================================================

  override parse(
    value: any
  ): Date | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {

      return null;
    }


    if (
      value instanceof Date
    ) {

      return value;
    }


    if (
      typeof value === 'string'
    ) {

      const texto =
        value.trim();


      // ======================================================
      // dd/MM/yyyy
      // ======================================================

      const visualMatch =
        texto.match(
          /^(\d{2})\/(\d{2})\/(\d{4})$/
        );


      if (
        visualMatch
      ) {

        const dia =
          Number(
            visualMatch[1]
          );


        const mes =
          Number(
            visualMatch[2]
          );


        const anio =
          Number(
            visualMatch[3]
          );


        const fecha =
          new Date(
            anio,
            mes - 1,
            dia
          );


        if (
          fecha.getFullYear() === anio &&
          fecha.getMonth() === mes - 1 &&
          fecha.getDate() === dia
        ) {

          return fecha;
        }


        return null;
      }


      // ======================================================
      // yyyy-MM-dd
      // yyyy-MM-ddTHH:mm:ss
      // ======================================================

      const apiMatch =
        texto.match(
          /^(\d{4})-(\d{2})-(\d{2})/
        );


      if (
        apiMatch
      ) {

        return new Date(
          Number(
            apiMatch[1]
          ),
          Number(
            apiMatch[2]
          ) - 1,
          Number(
            apiMatch[3]
          )
        );
      }
    }


    return null;
  }
}


// ============================================================
// FORMATOS DATEPICKER
// ============================================================

export const LIQUIDACION_DATE_FORMATS:
  MatDateFormats = {

    parse: {

      dateInput:
        'input'
    },

    display: {

      dateInput:
        'input',

      monthYearLabel:
        'monthYear',

      dateA11yLabel:
        'input',

      monthYearA11yLabel:
        'monthYear'
    }
  };


// ============================================================
// COMPONENTE
// ============================================================

@Component({

  selector:
    'app-liquidacion-empleado',

  templateUrl:
    './liquidacion-empleado.component.html',

  styleUrls: [
    './liquidacion-empleado.component.css'
  ],

  providers: [

    {
      provide:
        MAT_DATE_LOCALE,

      useValue:
        'es-EC'
    },

    {
      provide:
        DateAdapter,

      useClass:
        LiquidacionDateAdapter
    },

    {
      provide:
        MAT_DATE_FORMATS,

      useValue:
        LIQUIDACION_DATE_FORMATS
    }

  ]

})
export class LiquidacionEmpleadoComponent
  implements OnInit, OnDestroy {


  // ============================================================
  // FORM
  // ============================================================

  form!: FormGroup;


  // ============================================================
  // EMPLEADOS
  // ============================================================

  empleadosFiltrados:
    EmpleadoBusquedaResponse[] = [];


  empleadoSeleccionado:
    EmpleadoBusquedaResponse | null = null;


  buscandoEmpleados =
    false;


  cargandoEmpleado =
    false;


  // ============================================================
  // NOMINA
  // ============================================================

  validandoNomina =
    false;


  nominaMesProcesada =
    false;


  debeIncluirNomina =
    false;


  mensajeNomina =
    '';


  // ============================================================
  // RESULTADO
  // ============================================================

  cargando =
    false;


  resultado:
    LiquidacionCalculoResponse | null = null;


  ingresos:
    LiquidacionDetalleGrid[] = [];


  egresos:
    LiquidacionDetalleGrid[] = [];


  // ============================================================
  // AG GRID
  // ============================================================

  defaultColDef:
    ColDef<LiquidacionDetalleGrid> = {

      sortable:
        true,

      filter:
        true,

      resizable:
        true,

      suppressMovable:
        false
    };


  // ============================================================
  // COLUMNAS INGRESOS
  // ============================================================

  columnDefsIngresos:
    ColDef<LiquidacionDetalleGrid>[] = [

      // ========================================================
      // CODIGO
      //
      // Solo editable para filas manuales.
      // ========================================================

      {
        headerName:
          'Código',

        field:
          'codigo',

        width:
          85,

        minWidth:
          75,

        maxWidth:
          100,

        editable:
          params =>
            this.esFilaManual(
              params.data
            )
      },


      // ========================================================
      // RUBRO
      //
      // Solo editable para filas manuales.
      // ========================================================

      {
        headerName:
          'Rubro',

        field:
          'descripcion',

        flex:
          1,

        minWidth:
          180,

        editable:
          params =>
            this.esFilaManual(
              params.data
            )
      },


      // ========================================================
      // CANTIDAD
      //
      // EDITABLE EN TODAS LAS FILAS
      // ========================================================

      {
        headerName:
          'Cant.',

        field:
          'cantidad',

        width:
          95,

        minWidth:
          85,

        maxWidth:
          110,

        type:
          'numericColumn',

        editable:
          true,

        cellEditor:
          'agTextCellEditor',

        valueParser:
          params =>
            this.convertirNumero(
              params.newValue
            ),

        valueFormatter:
          params =>
            this.formatearCantidad(
              params.value
            )
      },


      // ========================================================
      // VALOR
      //
      // EDITABLE EN TODAS LAS FILAS
      // ========================================================

      {
        headerName:
          'Valor',

        field:
          'valor',

        width:
          125,

        minWidth:
          110,

        maxWidth:
          140,

        type:
          'numericColumn',

        editable:
          true,

        cellEditor:
          'agTextCellEditor',

        valueParser:
          params =>
            this.convertirNumero(
              params.newValue
            ),

        valueFormatter:
          params =>
            this.formatearMoneda(
              params.value
            )
      },


      // ========================================================
      // ORIGEN
      // ========================================================

      {
        headerName:
          'Origen',

        field:
          'origen',

        width:
          105,

        minWidth:
          95,

        maxWidth:
          120,

        editable:
          false
      },


      // ========================================================
      // ELIMINAR
      // ========================================================

      {
        headerName:
          '',

        colId:
          'eliminar',

        width:
          55,

        minWidth:
          55,

        maxWidth:
          55,

        sortable:
          false,

        filter:
          false,

        resizable:
          false,

        suppressMovable:
          true,

        cellRenderer: (
          params:
            ICellRendererParams<LiquidacionDetalleGrid>
        ) =>
          this.renderBotonEliminar(
            params
          ),

        onCellClicked: (
          params:
            CellClickedEvent<LiquidacionDetalleGrid>
        ) => {

          if (
            params.data
          ) {

            this.eliminarIngreso(
              params.data
            );
          }
        }
      }

    ];


  // ============================================================
  // COLUMNAS EGRESOS
  // ============================================================

  columnDefsEgresos:
    ColDef<LiquidacionDetalleGrid>[] = [

      // ========================================================
      // CODIGO
      // ========================================================

      {
        headerName:
          'Código',

        field:
          'codigo',

        width:
          85,

        minWidth:
          75,

        maxWidth:
          100,

        editable:
          params =>
            this.esFilaManual(
              params.data
            )
      },


      // ========================================================
      // RUBRO
      // ========================================================

      {
        headerName:
          'Rubro',

        field:
          'descripcion',

        flex:
          1,

        minWidth:
          180,

        editable:
          params =>
            this.esFilaManual(
              params.data
            )
      },


      // ========================================================
      // CANTIDAD
      //
      // EDITABLE EN TODAS LAS FILAS
      // ========================================================

      {
        headerName:
          'Cant.',

        field:
          'cantidad',

        width:
          95,

        minWidth:
          85,

        maxWidth:
          110,

        type:
          'numericColumn',

        editable:
          true,

        cellEditor:
          'agTextCellEditor',

        valueParser:
          params =>
            this.convertirNumero(
              params.newValue
            ),

        valueFormatter:
          params =>
            this.formatearCantidad(
              params.value
            )
      },


      // ========================================================
      // VALOR
      //
      // EDITABLE EN TODAS LAS FILAS
      // ========================================================

      {
        headerName:
          'Valor',

        field:
          'valor',

        width:
          125,

        minWidth:
          110,

        maxWidth:
          140,

        type:
          'numericColumn',

        editable:
          true,

        cellEditor:
          'agTextCellEditor',

        valueParser:
          params =>
            this.convertirNumero(
              params.newValue
            ),

        valueFormatter:
          params =>
            this.formatearMoneda(
              params.value
            )
      },


      // ========================================================
      // ORIGEN
      // ========================================================

      {
        headerName:
          'Origen',

        field:
          'origen',

        width:
          105,

        minWidth:
          95,

        maxWidth:
          120,

        editable:
          false
      },


      // ========================================================
      // ELIMINAR
      // ========================================================

      {
        headerName:
          '',

        colId:
          'eliminar',

        width:
          55,

        minWidth:
          55,

        maxWidth:
          55,

        sortable:
          false,

        filter:
          false,

        resizable:
          false,

        suppressMovable:
          true,

        cellRenderer: (
          params:
            ICellRendererParams<LiquidacionDetalleGrid>
        ) =>
          this.renderBotonEliminar(
            params
          ),

        onCellClicked: (
          params:
            CellClickedEvent<LiquidacionDetalleGrid>
        ) => {

          if (
            params.data
          ) {

            this.eliminarEgreso(
              params.data
            );
          }
        }
      }

    ];


  // ============================================================
  // RXJS
  // ============================================================

  private readonly destroy$ =
    new Subject<void>();


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(

    private fb:
      FormBuilder,

    private liquidacionService:
      LiquidacionEmpleadoService,

    private empleadoFichaService:
      EmpleadoFichaService,

    private snackBar:
      MatSnackBar

  ) { }


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.crearFormulario();

    this.configurarBusquedaEmpleado();

    this.configurarCambioFechaSalida();

    this.cargarEmpleadosBusqueda(
      ''
    );
  }


  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {

    this.destroy$
      .next();

    this.destroy$
      .complete();
  }


  // ============================================================
  // FORMULARIO
  // ============================================================

  private crearFormulario(): void {

    this.form =
      this.fb.group({

        empleadoBusqueda: [
          ''
        ],

        idEmpleado: [
          null,
          Validators.required
        ],

        idLocal: [
          null
        ],

        local: [
          ''
        ],

        fechaIngreso: [
          null,
          Validators.required
        ],

        fechaSalida: [
          new Date(),
          Validators.required
        ],

        ultimaRemuneracion: [
          0,
          [
            Validators.required,
            Validators.min(
              0
            )
          ]
        ],

        tipoSalida: [
          'DESAHUCIO',
          Validators.required
        ],

        incluirNomina: [
          false
        ],

        vacacionesAnticipadas: [
          false
        ]

      });
  }


  // ============================================================
  // BUSQUEDA EMPLEADO
  // ============================================================

  private configurarBusquedaEmpleado(): void {

    this.form
      .get(
        'empleadoBusqueda'
      )
      ?.valueChanges
      .pipe(

        debounceTime(
          300
        ),

        distinctUntilChanged(),

        takeUntil(
          this.destroy$
        )

      )
      .subscribe(
        valor => {

          // ====================================================
          // OBJETO AUTOCOMPLETE
          // ====================================================

          if (
            valor &&
            typeof valor === 'object'
          ) {

            return;
          }


          const texto =
            typeof valor === 'string'
              ? valor.trim()
              : '';


          // ====================================================
          // INVALIDAR EMPLEADO ANTERIOR
          // ====================================================

          if (
            this.empleadoSeleccionado
          ) {

            this.empleadoSeleccionado =
              null;


            this.form.patchValue(
              {

                idEmpleado:
                  null,

                idLocal:
                  null,

                local:
                  '',

                fechaIngreso:
                  null,

                ultimaRemuneracion:
                  0,

                incluirNomina:
                  false

              },
              {
                emitEvent:
                  false
              }
            );


            this.habilitarIncluirNomina();

            this.limpiarEstadoNomina();

            this.limpiarResultado();
          }


          this.cargarEmpleadosBusqueda(
            texto
          );
        }
      );
  }


  // ============================================================
  // CAMBIO FECHA SALIDA
  // ============================================================

  private configurarCambioFechaSalida(): void {

    this.form
      .get(
        'fechaSalida'
      )
      ?.valueChanges
      .pipe(

        debounceTime(
          150
        ),

        takeUntil(
          this.destroy$
        )

      )
      .subscribe(
        () => {

          const idEmpleado =
            Number(
              this.form
                .get(
                  'idEmpleado'
                )
                ?.value
            );


          if (
            !idEmpleado ||
            idEmpleado <= 0
          ) {

            return;
          }


          this.limpiarResultado();


          this.cargarDatosEmpleado(
            idEmpleado
          );


          this.validarNominaMes();
        }
      );
  }


  // ============================================================
  // BUSCAR EMPLEADOS
  // ============================================================

  cargarEmpleadosBusqueda(
    texto: string
  ): void {

    this.buscandoEmpleados =
      true;


    this.empleadoFichaService
      .getBusqueda(
        texto
      )
      .pipe(

        takeUntil(
          this.destroy$
        )

      )
      .subscribe({

        next: resp => {

          this.buscandoEmpleados =
            false;


          this.empleadosFiltrados =
            resp.data ??
            [];
        },


        error: error => {

          this.buscandoEmpleados =
            false;


          this.empleadosFiltrados =
            [];


          console.error(
            'Error buscando empleados:',
            error
          );
        }

      });
  }


  // ============================================================
  // DISPLAY EMPLEADO
  // ============================================================

  displayEmpleado(
    empleado:
      EmpleadoBusquedaResponse |
      string |
      null
  ): string {

    if (
      !empleado
    ) {

      return '';
    }


    if (
      typeof empleado === 'string'
    ) {

      return empleado;
    }


    return empleado
      .nombreCompleto ??
      '';
  }


  // ============================================================
  // SELECCIONAR EMPLEADO
  // ============================================================

  seleccionarEmpleadoBusqueda(
    empleado:
      EmpleadoBusquedaResponse
  ): void {

    if (
      !empleado
    ) {

      return;
    }


    const idEmpleado =
      Number(
        empleado.idEmpleado
      );


    if (
      !idEmpleado ||
      idEmpleado <= 0
    ) {

      this.mostrarMensaje(
        'El empleado seleccionado no es válido.'
      );

      return;
    }


    this.empleadoSeleccionado =
      empleado;


    this.form.patchValue(
      {

        empleadoBusqueda:
          empleado,

        idEmpleado:
          idEmpleado

      },
      {
        emitEvent:
          false
      }
    );


    this.limpiarResultado();

    this.limpiarEstadoNomina();


    this.cargarDatosEmpleado(
      idEmpleado
    );


    this.validarNominaMes();
  }


  // ============================================================
  // DATOS EMPLEADO
  // ============================================================

  private cargarDatosEmpleado(
    idEmpleado: number
  ): void {

    const fechaSalida =
      this.fechaApi(
        this.form
          .get(
            'fechaSalida'
          )
          ?.value
      );


    if (
      !fechaSalida
    ) {

      this.mostrarMensaje(
        'Seleccione una fecha de salida válida.'
      );

      return;
    }


    this.cargandoEmpleado =
      true;


    this.liquidacionService
      .obtenerEmpleado(
        idEmpleado,
        fechaSalida
      )
      .pipe(

        takeUntil(
          this.destroy$
        )

      )
      .subscribe({

        next: resp => {

          this.cargandoEmpleado =
            false;


          if (
            resp.type !== 'success' ||
            !resp.data
          ) {

            this.mostrarMensaje(
              resp.message ||
              'No se pudo consultar la información del empleado.'
            );

            return;
          }


          const empleado =
            resp.data;


          this.form.patchValue(
            {

              idEmpleado:
                empleado.idEmpleado,

              idLocal:
                empleado.idLocal ??
                null,

              local:
                empleado.local ??
                '',

              fechaIngreso:
                empleado.fechaIngreso
                  ? this.convertirFecha(
                      empleado.fechaIngreso
                    )
                  : null,

              ultimaRemuneracion:
                empleado.ultimaRemuneracion ??
                0

            },
            {
              emitEvent:
                false
            }
          );
        },


        error: error => {

          this.cargandoEmpleado =
            false;


          console.error(
            'Error consultando empleado:',
            error
          );


          this.mostrarMensaje(
            error?.error?.message ||
            'No fue posible cargar la información del empleado.'
          );
        }

      });
  }


  // ============================================================
  // VALIDAR NOMINA
  // ============================================================

  private validarNominaMes(): void {

    const idEmpleado =
      Number(
        this.form
          .get(
            'idEmpleado'
          )
          ?.value
      );


    const fechaSalida =
      this.fechaApi(
        this.form
          .get(
            'fechaSalida'
          )
          ?.value
      );


    if (
      !idEmpleado ||
      !fechaSalida
    ) {

      return;
    }


    this.validandoNomina =
      true;


    this.liquidacionService
      .validarNominaMes(
        idEmpleado,
        fechaSalida
      )
      .pipe(

        takeUntil(
          this.destroy$
        )

      )
      .subscribe({

        next: resp => {

          this.validandoNomina =
            false;


          if (
            resp.type !== 'success' ||
            !resp.data
          ) {

            this.limpiarEstadoNomina();

            return;
          }


          this.nominaMesProcesada =
            resp.data.nominaProcesada;


          this.debeIncluirNomina =
            resp.data.debeIncluirNomina;


          this.mensajeNomina =
            resp.data.mensaje ??
            '';


          const control =
            this.form.get(
              'incluirNomina'
            );


          // ====================================================
          // NOMINA NO PROCESADA
          // ====================================================

          if (
            this.debeIncluirNomina
          ) {

            control?.setValue(
              true,
              {
                emitEvent:
                  false
              }
            );


            control?.disable(
              {
                emitEvent:
                  false
              }
            );
          }
          else {

            if (
              control?.disabled
            ) {

              control.enable(
                {
                  emitEvent:
                    false
                }
              );
            }
          }
        },


        error: error => {

          this.validandoNomina =
            false;


          console.error(
            'Error validando nómina:',
            error
          );


          this.limpiarEstadoNomina();

          this.habilitarIncluirNomina();
        }

      });
  }


  // ============================================================
  // CALCULAR
  // ============================================================

  calcular(): void {

    if (
      this.validandoNomina ||
      this.cargandoEmpleado
    ) {

      return;
    }


    if (
      !this.form
        .get(
          'idEmpleado'
        )
        ?.value
    ) {

      this.mostrarMensaje(
        'Seleccione un empleado.'
      );

      return;
    }


    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();


      this.mostrarMensaje(
        'Revise los datos obligatorios.'
      );

      return;
    }


    const fechaIngreso =
      this.fechaApi(
        this.form
          .get(
            'fechaIngreso'
          )
          ?.value
      );


    const fechaSalida =
      this.fechaApi(
        this.form
          .get(
            'fechaSalida'
          )
          ?.value
      );


    if (
      !fechaIngreso ||
      !fechaSalida
    ) {

      this.mostrarMensaje(
        'Las fechas de ingreso y salida son obligatorias.'
      );

      return;
    }


    if (
      fechaSalida <
      fechaIngreso
    ) {

      this.mostrarMensaje(
        'La fecha de salida no puede ser menor que la fecha de ingreso.'
      );

      return;
    }


    // ==========================================================
    // REQUEST
    // ==========================================================

    const request:
      CalcularLiquidacionRequest = {

        idEmpleado:
          Number(
            this.form
              .get(
                'idEmpleado'
              )
              ?.value
          ),

        idLocal:
          this.obtenerNumeroNullable(
            this.form
              .get(
                'idLocal'
              )
              ?.value
          ),

        fechaIngreso:
          fechaIngreso,

        fechaSalida:
          fechaSalida,

        tipoSalida:
          this.form
            .get(
              'tipoSalida'
            )
            ?.value,

        incluirNomina:
          !!this.form
            .get(
              'incluirNomina'
            )
            ?.value,

        vacacionesAnticipadas:
          !!this.form
            .get(
              'vacacionesAnticipadas'
            )
            ?.value,

        ultimaRemuneracion:
          Number(
            this.form
              .get(
                'ultimaRemuneracion'
              )
              ?.value ??
            0
          )
      };


    this.cargando =
      true;


    this.limpiarResultado();


    this.liquidacionService
      .calcular(
        request
      )
      .pipe(

        takeUntil(
          this.destroy$
        )

      )
      .subscribe({

        next: resp => {

          this.cargando =
            false;


          if (
            resp.type !== 'success' ||
            !resp.data
          ) {

            this.mostrarMensaje(
              resp.message ||
              'No fue posible calcular la liquidación.'
            );

            return;
          }


          this.resultado =
            resp.data;


          // ====================================================
          // REMUNERACION DEVUELTA POR BACKEND
          // ====================================================

          this.form.patchValue(
            {

              ultimaRemuneracion:
                resp.data
                  .ultimaRemuneracion

            },
            {
              emitEvent:
                false
            }
          );


          // ====================================================
          // CARGAR GRIDS
          // ====================================================

          this.separarRubros(
            resp.data.detalles ??
            []
          );


          this.sincronizarTotalesResultado();
        },


        error: error => {

          this.cargando =
            false;


          console.error(
            'Error calculando liquidación:',
            error
          );


          this.mostrarMensaje(
            error?.error?.message ||
            error?.error?.title ||
            'Ocurrió un error al calcular la liquidación.'
          );
        }

      });
  }


  // ============================================================
  // SEPARAR RUBROS
  // ============================================================

  private separarRubros(
    detalles:
      LiquidacionDetalleResponse[]
  ): void {

    this.ingresos =
      detalles
        .filter(
          x =>
            x.tipoRubro === 'I' ||
            x.tipoRubro === 'P'
        )
        .map(
          x => ({

            ...x,

            esManual:
              false,

            uid:
              this.generarUid()

          })
        );


    this.egresos =
      detalles
        .filter(
          x =>
            x.tipoRubro === 'D'
        )
        .map(
          x => ({

            ...x,

            esManual:
              false,

            uid:
              this.generarUid()

          })
        );
  }


  // ============================================================
  // INSERTAR INGRESO
  // ============================================================

  insertarIngreso(): void {

    if (
      !this.resultado
    ) {

      this.mostrarMensaje(
        'Primero debe calcular la liquidación.'
      );

      return;
    }


    const nuevo:
      LiquidacionDetalleGrid = {

        idIngresoDesc:
          null,

        codigo:
          '',

        tipoRubro:
          'I',

        descripcion:
          '',

        cantidad:
          0,

        valor:
          0,

        origen:
          'MANUAL',

        esManual:
          true,

        uid:
          this.generarUid()
      };


    this.ingresos = [
      ...this.ingresos,
      nuevo
    ];


    this.sincronizarTotalesResultado();
  }


  // ============================================================
  // INSERTAR EGRESO
  // ============================================================

  insertarEgreso(): void {

    if (
      !this.resultado
    ) {

      this.mostrarMensaje(
        'Primero debe calcular la liquidación.'
      );

      return;
    }


    const nuevo:
      LiquidacionDetalleGrid = {

        idIngresoDesc:
          null,

        codigo:
          '',

        tipoRubro:
          'D',

        descripcion:
          '',

        cantidad:
          0,

        valor:
          0,

        origen:
          'MANUAL',

        esManual:
          true,

        uid:
          this.generarUid()
      };


    this.egresos = [
      ...this.egresos,
      nuevo
    ];


    this.sincronizarTotalesResultado();
  }


  // ============================================================
  // ELIMINAR INGRESO
  // ============================================================

  eliminarIngreso(
    item:
      LiquidacionDetalleGrid
  ): void {

    if (
      !item
    ) {

      return;
    }


    this.ingresos =
      this.ingresos.filter(
        x =>
          x.uid !== item.uid
      );


    this.sincronizarTotalesResultado();
  }


  // ============================================================
  // ELIMINAR EGRESO
  // ============================================================

  eliminarEgreso(
    item:
      LiquidacionDetalleGrid
  ): void {

    if (
      !item
    ) {

      return;
    }


    this.egresos =
      this.egresos.filter(
        x =>
          x.uid !== item.uid
      );


    this.sincronizarTotalesResultado();
  }


  // ============================================================
  // RENDER BOTON ELIMINAR
  //
  // APARECE EN TODAS LAS FILAS
  // ============================================================

  private renderBotonEliminar(
    params:
      ICellRendererParams<LiquidacionDetalleGrid>
  ): HTMLElement | string {

    if (
      !params.data
    ) {

      return '';
    }


    const boton =
      document.createElement(
        'button'
      );


    boton.type =
      'button';


    boton.className =
      'grid-delete-button';


    boton.title =
      'Eliminar fila';


    const icono =
      document.createElement(
        'span'
      );


    icono.className =
      'material-icons';


    icono.innerText =
      'delete';


    boton.appendChild(
      icono
    );


    return boton;
  }


  // ============================================================
  // CAMBIO DE CELDA
  //
  // CANTIDAD Y VALOR SON EDITABLES PARA TODAS LAS FILAS.
  // ============================================================

  onCellValueChanged(
    event:
      CellValueChangedEvent<LiquidacionDetalleGrid>
  ): void {

    if (
      !event.data
    ) {

      return;
    }


    // ==========================================================
    // NORMALIZAR CANTIDAD
    // ==========================================================

    event.data.cantidad =
      this.convertirNumero(
        event.data.cantidad
      );


    // ==========================================================
    // NORMALIZAR VALOR
    // ==========================================================

    event.data.valor =
      this.convertirNumero(
        event.data.valor
      );


    // ==========================================================
    // REFRESCAR ARRAY
    // ==========================================================

    if (
      event.data.tipoRubro === 'D'
    ) {

      this.egresos = [
        ...this.egresos
      ];

    }
    else {

      this.ingresos = [
        ...this.ingresos
      ];
    }


    // ==========================================================
    // RECALCULAR TOTALES
    // ==========================================================

    this.sincronizarTotalesResultado();
  }


  // ============================================================
  // ACTUALIZAR TOTALES DEL RESPONSE LOCAL
  // ============================================================

  private sincronizarTotalesResultado(): void {

    if (
      !this.resultado
    ) {

      return;
    }


    this.resultado.totalIngresos =
      this.totalIngresos;


    this.resultado.totalEgresos =
      this.totalEgresos;


    this.resultado.liquidoRecibir =
      this.liquidoRecibir;
  }


  // ============================================================
  // FILA MANUAL
  //
  // SE USA PARA PERMITIR EDICION DE CODIGO Y RUBRO.
  // ============================================================

  private esFilaManual(
    item:
      LiquidacionDetalleGrid |
      undefined |
      null
  ): boolean {

    return (
      item?.esManual === true ||
      item?.origen === 'MANUAL'
    );
  }


  // ============================================================
  // UID
  // ============================================================

  private generarUid(): string {

    return (
      Date.now()
        .toString() +
      '-' +
      Math.random()
        .toString(
          36
        )
        .substring(
          2,
          10
        )
    );
  }


  // ============================================================
  // CONVERTIR NUMERO
  // ============================================================

  private convertirNumero(
    valor: any
  ): number {

    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {

      return 0;
    }


    const texto =
      String(
        valor
      )
        .replace(
          /[$,\s]/g,
          ''
        );


    const numero =
      Number(
        texto
      );


    return Number.isNaN(
      numero
    )
      ? 0
      : numero;
  }


  // ============================================================
  // MONEDA
  // ============================================================

  private formatearMoneda(
    valor: any
  ): string {

    return new Intl.NumberFormat(
      'en-US',
      {
        style:
          'currency',

        currency:
          'USD',

        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    ).format(
      this.convertirNumero(
        valor
      )
    );
  }


  // ============================================================
  // CANTIDAD
  // ============================================================

  private formatearCantidad(
    valor: any
  ): string {

    return new Intl.NumberFormat(
      'en-US',
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    ).format(
      this.convertirNumero(
        valor
      )
    );
  }


  // ============================================================
  // LIMPIAR ESTADO NOMINA
  // ============================================================

  private limpiarEstadoNomina(): void {

    this.nominaMesProcesada =
      false;


    this.debeIncluirNomina =
      false;


    this.mensajeNomina =
      '';
  }


  // ============================================================
  // HABILITAR CHECK NOMINA
  // ============================================================

  private habilitarIncluirNomina(): void {

    const control =
      this.form?.get(
        'incluirNomina'
      );


    if (
      control?.disabled
    ) {

      control.enable(
        {
          emitEvent:
            false
        }
      );
    }
  }


  // ============================================================
  // LIMPIAR RESULTADO
  // ============================================================

  private limpiarResultado(): void {

    this.resultado =
      null;


    this.ingresos =
      [];


    this.egresos =
      [];
  }


  // ============================================================
  // LIMPIAR
  // ============================================================

  limpiar(): void {

    this.empleadoSeleccionado =
      null;


    this.habilitarIncluirNomina();


    this.form.reset({

      empleadoBusqueda:
        '',

      idEmpleado:
        null,

      idLocal:
        null,

      local:
        '',

      fechaIngreso:
        null,

      fechaSalida:
        new Date(),

      ultimaRemuneracion:
        0,

      tipoSalida:
        'DESAHUCIO',

      incluirNomina:
        false,

      vacacionesAnticipadas:
        false

    });


    this.limpiarResultado();

    this.limpiarEstadoNomina();


    this.cargarEmpleadosBusqueda(
      ''
    );
  }


  // ============================================================
  // STRING -> DATE
  // ============================================================

  private convertirFecha(
    fecha: string
  ): Date {

    const partes =
      fecha
        .substring(
          0,
          10
        )
        .split(
          '-'
        );


    return new Date(
      Number(
        partes[0]
      ),
      Number(
        partes[1]
      ) - 1,
      Number(
        partes[2]
      )
    );
  }


  // ============================================================
  // DATE -> yyyy-MM-dd
  // ============================================================

  private fechaApi(
    valor:
      Date |
      string |
      null |
      undefined
  ): string {

    if (
      !valor
    ) {

      return '';
    }


    if (
      typeof valor === 'string'
    ) {

      const fecha =
        valor.substring(
          0,
          10
        );


      if (
        /^\d{4}-\d{2}-\d{2}$/
          .test(
            fecha
          )
      ) {

        return fecha;
      }


      return '';
    }


    const anio =
      valor.getFullYear();


    const mes =
      String(
        valor.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const dia =
      String(
        valor.getDate()
      ).padStart(
        2,
        '0'
      );


    return `${anio}-${mes}-${dia}`;
  }


  // ============================================================
  // NUMERO NULLABLE
  // ============================================================

  private obtenerNumeroNullable(
    valor: any
  ): number | null {

    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {

      return null;
    }


    const numero =
      Number(
        valor
      );


    return Number.isNaN(
      numero
    )
      ? null
      : numero;
  }


  // ============================================================
  // MENSAJE
  // ============================================================

  private mostrarMensaje(
    mensaje: string
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration:
          4000
      }
    );
  }


  // ============================================================
  // TOTAL INGRESOS
  //
  // UTILIZA EL VALOR ACTUAL DEL GRID.
  // ============================================================

  get totalIngresos(): number {

    const total =
      this.ingresos
        .reduce(
          (
            acumulado,
            item
          ) => {

            return (
              acumulado +
              this.convertirNumero(
                item.valor
              )
            );

          },
          0
        );


    return Math.round(
      total *
      100
    ) / 100;
  }


  // ============================================================
  // TOTAL EGRESOS
  // ============================================================

  get totalEgresos(): number {

    const total =
      this.egresos
        .reduce(
          (
            acumulado,
            item
          ) => {

            return (
              acumulado +
              this.convertirNumero(
                item.valor
              )
            );

          },
          0
        );


    return Math.round(
      total *
      100
    ) / 100;
  }


  // ============================================================
  // LIQUIDO
  // ============================================================

  get liquidoRecibir(): number {

    return Math.round(
      (
        this.totalIngresos -
        this.totalEgresos
      ) *
      100
    ) / 100;
  }

}