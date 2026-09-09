import {
  Component,
  OnInit
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs/operators';

import {
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';

import {
  UsuarioService
} from 'src/app/services/usuario.service';

import {
  EmpleadoBusquedaResponse,
  EmpleadoFichaService
} from 'src/app/services/rol/empleado-ficha.service';

import {
  CalcularJubilacionPatronalRequest,
  JubilacionPatronalDetalleResponse,
  JubilacionPatronalResponse,
  JubilacionPatronalService
} from 'src/app/services/rol/jubilacion-patronal.service';


@Component({
  selector: 'app-jubilacion-patronal',
  templateUrl: './jubilacion-patronal.component.html',
  styleUrls: ['./jubilacion-patronal.component.css']
})
export class JubilacionPatronalComponent
  implements OnInit {

  // ==========================================================
  // USUARIO
  // ==========================================================

  usuarioActual =
    this.usuarioService
      .getUsuarioActual();


  // ==========================================================
  // FORMULARIO
  // ==========================================================

  form!: FormGroup;


  // ==========================================================
  // ESTADOS
  // ==========================================================

  cargando =
    false;

  cargandoEmpleados =
    false;


  // ==========================================================
  // BÚSQUEDA EMPLEADOS
  // ==========================================================

  empleadosBusqueda:
    EmpleadoBusquedaResponse[] =
      [];

  empleadosFiltrados:
    EmpleadoBusquedaResponse[] =
      [];


  // ==========================================================
  // RESULTADO
  // ==========================================================

  resultado:
    JubilacionPatronalResponse |
    null =
      null;


  // ==========================================================
  // AG GRID
  // ==========================================================

  rowData:
    JubilacionPatronalDetalleResponse[] =
      [];

  pinnedBottomRowData:
    any[] =
      [];

  private gridApi?:
    GridApi;


  overlayNoRowsTemplate =
    '<span style="padding:10px;">No existen remuneraciones para mostrar.</span>';


  // ==========================================================
  // CONFIGURACIÓN GENERAL GRID
  // ==========================================================

  defaultColDef:
    ColDef = {

      sortable:
        true,

      filter:
        true,

      resizable:
        true
    };


  // ==========================================================
  // COLUMNAS AG GRID
  // ==========================================================

  columnDefs:
    ColDef[] = [

      // ======================================================
      // AÑO
      // ======================================================

      {
        headerName:
          'Año',

        field:
          'anio',

        width:
          100,

        minWidth:
          90,

        pinned:
          'left',

        cellClass:
          'text-center',

        valueFormatter:
          params => {

            if (
              params.node &&
              params.node.rowPinned
            ) {

              return 'TOTAL';
            }

            return params.value
              ? String(params.value)
              : '';
          }
      },


      // ======================================================
      // MES
      // ======================================================

      {
        headerName:
          'Mes',

        field:
          'mes',

        width:
          140,

        minWidth:
          120,

        pinned:
          'left',

        valueFormatter:
          params => {

            if (
              params.node &&
              params.node.rowPinned
            ) {

              return '';
            }

            return this.obtenerMes(
              Number(
                params.value
                ??
                0
              )
            );
          }
      },


      // ======================================================
      // REMUNERACIÓN
      // ======================================================

      {
        headerName:
          'Remuneración',

        field:
          'remuneracion',

        flex:
          1,

        minWidth:
          160,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          'cell-money'
      },


      // ======================================================
      // REMUNERACIÓN APORTABLE
      // ======================================================

      {
        headerName:
          'Remuneración Aportable',

        field:
          'remuneracionAportable',

        flex:
          1,

        minWidth:
          190,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          'cell-money'
      },


      // ======================================================
      // FONDO RESERVA
      // ======================================================

      {
        headerName:
          'Fondo Reserva',

        field:
          'fondoReserva',

        flex:
          1,

        minWidth:
          160,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          'cell-money'
      }
    ];


  // ==========================================================
  // MESES
  // ==========================================================

  private readonly meses:
    string[] = [

      '',

      'ENERO',

      'FEBRERO',

      'MARZO',

      'ABRIL',

      'MAYO',

      'JUNIO',

      'JULIO',

      'AGOSTO',

      'SEPTIEMBRE',

      'OCTUBRE',

      'NOVIEMBRE',

      'DICIEMBRE'
    ];


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(

    private readonly fb:
      FormBuilder,

    private readonly jubilacionPatronalService:
      JubilacionPatronalService,

    private readonly usuarioService:
      UsuarioService,

    private readonly empleadoFichaService:
      EmpleadoFichaService

  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit():
    void {

    this.crearFormulario();

    this.configurarBusquedaEmpleado();

    this.cargarEmpleadosBusqueda(
      ''
    );
  }


  // ==========================================================
  // CREAR FORMULARIO
  // ==========================================================

  private crearFormulario():
    void {

    this.form =
      this.fb.group({

        // ====================================================
        // EMPRESA
        // ====================================================

        idEmpresa: [

          this.usuarioActual
            ?.id_empresa
          ??
          1,

          [
            Validators.required,
            Validators.min(1)
          ]
        ],


        // ====================================================
        // EMPLEADO
        // ====================================================

        idEmpleado: [

          null,

          Validators.required
        ],


        // ====================================================
        // TEXTO DE BÚSQUEDA
        // ====================================================

        empleadoBusqueda: [
          ''
        ],


        // ====================================================
        // FECHA CÁLCULO
        // ====================================================

        fechaCalculo: [

          this.obtenerFechaActual(),

          Validators.required
        ],


        // ====================================================
        // TIPO SALIDA
        // ====================================================

        tipoSalida: [

          'RENUNCIA',

          Validators.required
        ]

      });
  }


  // ==========================================================
  // CONFIGURAR BÚSQUEDA EMPLEADO
  // ==========================================================

  private configurarBusquedaEmpleado():
    void {

    this.form
      .get(
        'empleadoBusqueda'
      )
      ?.valueChanges
      .pipe(

        debounceTime(
          300
        ),

        distinctUntilChanged()

      )
      .subscribe(
        valor => {

          // ==================================================
          // SI MAT-AUTOCOMPLETE DEVUELVE OBJETO
          // NO VOLVER A BUSCAR
          // ==================================================

          if (
            typeof valor ===
              'object'
            &&
            valor !== null
          ) {

            return;
          }


          const texto =
            (
              valor
              ??
              ''
            )
              .toString()
              .trim();


          // ==================================================
          // AL ESCRIBIR NUEVAMENTE
          // QUITAR EMPLEADO SELECCIONADO
          // ==================================================

          this.form
            .get(
              'idEmpleado'
            )
            ?.setValue(
              null,
              {
                emitEvent:
                  false
              }
            );


          // ==================================================
          // LIMPIAR RESULTADO ANTERIOR
          // ==================================================

          this.limpiarResultado();


          // ==================================================
          // BUSCAR
          // ==================================================

          this.cargarEmpleadosBusqueda(
            texto
          );
        }
      );
  }


  // ==========================================================
  // CARGAR EMPLEADOS
  // ==========================================================

  cargarEmpleadosBusqueda(
    texto:
      string = ''
  ): void {

    this.cargandoEmpleados =
      true;


    this.empleadoFichaService
      .getBusqueda(
        texto
      )
      .pipe(

        finalize(
          () => {

            this.cargandoEmpleados =
              false;
          }
        )

      )
      .subscribe({

        next:
          resp => {

            this.empleadosBusqueda =
              resp.data
              ??
              [];


            this.empleadosFiltrados =
              this.empleadosBusqueda;
          },


        error:
          err => {

            console.error(
              'Error cargando empleados Jubilación Patronal:',
              err
            );


            this.empleadosBusqueda =
              [];


            this.empleadosFiltrados =
              [];


            alert(
              'Error cargando empleados.'
            );
          }

      });
  }


  // ==========================================================
  // SELECCIONAR EMPLEADO
  // ==========================================================

  seleccionarEmpleadoBusqueda(
    emp:
      EmpleadoBusquedaResponse
  ): void {

    if (!emp) {
      return;
    }


    const idEmpleado =
      Number(
        emp.idEmpleado
      );


    if (
      !Number.isFinite(
        idEmpleado
      )
      ||
      idEmpleado <= 0
    ) {

      alert(
        'El empleado seleccionado no tiene un código válido.'
      );

      return;
    }


    this.form.patchValue(
      {

        idEmpleado:
          idEmpleado,

        empleadoBusqueda:
          emp.nombreCompleto
          ??
          ''

      },
      {
        emitEvent:
          false
      }
    );


    // ========================================================
    // LIMPIAR RESULTADO DEL EMPLEADO ANTERIOR
    // ========================================================

    this.limpiarResultado();
  }


  // ==========================================================
  // DISPLAY AUTOCOMPLETE
  // ==========================================================

  displayEmpleado(
    empleado:
      EmpleadoBusquedaResponse |
      string |
      null
  ): string {

    if (!empleado) {
      return '';
    }


    if (
      typeof empleado ===
      'string'
    ) {

      return empleado;
    }


    return (
      empleado.nombreCompleto
      ??
      ''
    );
  }


  // ==========================================================
  // LIMPIAR SOLO EMPLEADO
  // ==========================================================

  limpiarBusquedaEmpleado(
    event?:
      MouseEvent
  ): void {

    if (event) {

      event.preventDefault();

      event.stopPropagation();
    }


    this.form.patchValue(
      {

        idEmpleado:
          null,

        empleadoBusqueda:
          ''

      },
      {
        emitEvent:
          false
      }
    );


    this.empleadosBusqueda =
      [];


    this.empleadosFiltrados =
      [];


    this.limpiarResultado();


    this.cargarEmpleadosBusqueda(
      ''
    );
  }


  // ==========================================================
  // GRID READY
  // ==========================================================

  onGridReady(
    event:
      GridReadyEvent
  ): void {

    this.gridApi =
      event.api;
  }


  // ==========================================================
  // CALCULAR
  // ==========================================================

  calcular():
    void {

    if (
      this.cargando
    ) {

      return;
    }


    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();


      if (
        !this.form
          .get(
            'idEmpleado'
          )
          ?.value
      ) {

        alert(
          'Debe seleccionar un empleado.'
        );

        return;
      }


      alert(
        'Complete los campos obligatorios.'
      );

      return;
    }


    const value =
      this.form
        .getRawValue();


    const idEmpresa =
      Number(
        value.idEmpresa
      );


    const idEmpleado =
      Number(
        value.idEmpleado
      );


    if (
      !Number.isFinite(
        idEmpresa
      )
      ||
      idEmpresa <= 0
    ) {

      alert(
        'No se pudo determinar la empresa.'
      );

      return;
    }


    if (
      !Number.isFinite(
        idEmpleado
      )
      ||
      idEmpleado <= 0
    ) {

      alert(
        'Debe seleccionar un empleado.'
      );

      return;
    }


    const request:
      CalcularJubilacionPatronalRequest =
      {

        idEmpresa:
          idEmpresa,

        idEmpleado:
          idEmpleado,

        fechaCalculo:
          value.fechaCalculo,

        tipoSalida:
          value.tipoSalida

      };


    console.log(
      'REQUEST JUBILACIÓN PATRONAL:',
      request
    );


    this.cargando =
      true;


    this.limpiarResultado();


    this.jubilacionPatronalService
      .calcular(
        request
      )
      .pipe(

        finalize(
          () => {

            this.cargando =
              false;
          }
        )

      )
      .subscribe({

        next:
          response => {

            console.log(
              'RESPONSE JUBILACIÓN PATRONAL:',
              response
            );


            if (!response) {

              alert(
                'El backend no devolvió información.'
              );

              return;
            }


            this.resultado =
              response;


            this.rowData =
              response.detalle
              ??
              [];


            this.calcularTotales();
          },


        error:
          error => {

            console.error(
              'Error Jubilación Patronal:',
              error
            );


            this.limpiarResultado();


            let mensaje =
              'Error al calcular Jubilación Patronal.';


            if (
              error?.error?.message
            ) {

              mensaje =
                error.error.message;
            }
            else if (
              error?.error?.title
            ) {

              mensaje =
                error.error.title;
            }
            else if (
              error?.message
            ) {

              mensaje =
                error.message;
            }


            alert(
              mensaje
            );
          }

      });
  }


  // ==========================================================
  // CALCULAR FILA TOTAL
  // ==========================================================

  private calcularTotales():
    void {

    if (
      !this.resultado
    ) {

      this.pinnedBottomRowData =
        [];

      return;
    }


    this.pinnedBottomRowData = [
      {

        anio:
          null,

        mes:
          null,

        remuneracion:
          Number(
            this.resultado
              .totalRemuneraciones
            ??
            0
          ),

        remuneracionAportable:
          Number(
            this.resultado
              .totalRemuneracionesAportables
            ??
            0
          ),

        fondoReserva:
          Number(
            this.resultado
              .totalFondosReserva
            ??
            0
          )
      }
    ];
  }


  // ==========================================================
  // LIMPIAR RESULTADO
  // ==========================================================

  private limpiarResultado():
    void {

    this.resultado =
      null;


    this.rowData =
      [];


    this.pinnedBottomRowData =
      [];


    if (
      this.gridApi
    ) {

      this.gridApi
        .setFilterModel(
          null
        );
    }
  }


  // ==========================================================
  // LIMPIAR FORMULARIO
  // ==========================================================

  limpiar():
    void {

    this.form.patchValue(
      {

        idEmpresa:
          this.usuarioActual
            ?.id_empresa
          ??
          1,

        idEmpleado:
          null,

        empleadoBusqueda:
          '',

        fechaCalculo:
          this.obtenerFechaActual(),

        tipoSalida:
          'RENUNCIA'

      },
      {
        emitEvent:
          false
      }
    );


    this.empleadosBusqueda =
      [];


    this.empleadosFiltrados =
      [];


    this.limpiarResultado();


    this.cargarEmpleadosBusqueda(
      ''
    );
  }


  // ==========================================================
  // ESTADO JUBILACIÓN
  // ==========================================================

  get textoEstado():
    string {

    if (
      !this.resultado
    ) {

      return '';
    }


    if (
      this.resultado
        .cumpleJubilacionPatronal
    ) {

      return (
        'CUMPLE JUBILACIÓN PATRONAL'
      );
    }


    if (
      this.resultado
        .cumpleJubilacionProporcional
    ) {

      return (
        'CUMPLE JUBILACIÓN PROPORCIONAL'
      );
    }


    return 'NO CUMPLE';
  }


  // ==========================================================
  // CLASE ESTADO
  // ==========================================================

  get claseEstado():
    string {

    if (
      !this.resultado
    ) {

      return '';
    }


    if (
      this.resultado
        .cumpleJubilacionPatronal
    ) {

      return 'estado-cumple';
    }


    if (
      this.resultado
        .cumpleJubilacionProporcional
    ) {

      return 'estado-proporcional';
    }


    return 'estado-no-cumple';
  }


  // ==========================================================
  // TIEMPO SERVICIO
  // ==========================================================

  get tiempoServicio():
    string {

    if (
      !this.resultado
    ) {

      return '';
    }


    return (
      `${this.resultado.aniosServicio} año(s), ` +
      `${this.resultado.mesesServicio} mes(es), ` +
      `${this.resultado.diasServicio} día(s)`
    );
  }


  // ==========================================================
  // MES
  // ==========================================================

  obtenerMes(
    mes:
      number
  ): string {

    if (
      mes < 1
      ||
      mes > 12
    ) {

      return '';
    }


    return (
      this.meses[mes]
      ??
      ''
    );
  }


  // ==========================================================
  // FORMATO NÚMERO
  // ==========================================================

  formatearNumero(
    value:
      any
  ): string {

    const numero =
      Number(
        value
        ??
        0
      );


    if (
      !Number.isFinite(
        numero
      )
    ) {

      return '0.00';
    }


    return numero
      .toLocaleString(
        'en-US',
        {

          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2

        }
      );
  }


  // ==========================================================
  // FORMATO FECHA
  // ==========================================================

  formatearFecha(
    value:
      string |
      null |
      undefined
  ): string {

    if (!value) {
      return '-';
    }


    const valor =
      value.substring(
        0,
        10
      );


    const partes =
      valor.split(
        '-'
      );


    if (
      partes.length !== 3
    ) {

      return value;
    }


    return (
      `${partes[2]}/` +
      `${partes[1]}/` +
      `${partes[0]}`
    );
  }


  // ==========================================================
  // FECHA ACTUAL
  // ==========================================================

  private obtenerFechaActual():
    string {

    const hoy =
      new Date();


    const year =
      hoy.getFullYear();


    const month =
      String(
        hoy.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        hoy.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return (
      `${year}-${month}-${day}`
    );
  }
}