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

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  CalcularImpuestoRentaRequest,
  GrabarImpuestoRentaRequest,
  GenerarRdepRequest,
  ImpuestoRentaResponse,
  ImpuestoRentaService
} from 'src/app/services/rol/impuesto-renta.service';


@Component({
  selector: 'app-impuestos-renta',
  templateUrl: './impuestos-renta.component.html',
  styleUrls: ['./impuestos-renta.component.css']
})
export class ImpuestosRentaComponent
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

  cargando = false;

  guardando = false;

  generandoXml = false;

  cargandoEmpleados = false;


  // ==========================================================
  // BUSQUEDA EMPLEADOS
  // ==========================================================

  empleadosBusqueda:
    EmpleadoBusquedaResponse[] = [];

  empleadosFiltrados:
    EmpleadoBusquedaResponse[] = [];


  // ==========================================================
  // MODAL CONFIRMACION
  // ==========================================================

  mostrarConfirmacion = false;

  tituloConfirmacion = '';

  mensajeConfirmacion = '';

  textoAceptarConfirmacion = '';

  accionConfirmacion:
    'GRABAR' |
    'XML' |
    null = null;


  // ==========================================================
  // GRID
  // ==========================================================

  rowData:
    ImpuestoRentaResponse[] = [];

  pinnedBottomRowData:
    any[] = [];

  private gridApi?:
    GridApi;


  overlayNoRowsTemplate =
    '<span style="padding:10px;">No existen datos para mostrar.</span>';


  // ==========================================================
  // CONFIGURACION GENERAL GRID
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
  // COLUMNAS
  // ==========================================================

  columnDefs:
    ColDef[] = [

      {
        headerName:
          'Local',

        field:
          'local',

        width:
          165,

        minWidth:
          140,

        pinned:
          'left'
      },

      {
        headerName:
          'N.º Afiliación',

        field:
          'numeroAfiliacion',

        width:
          125,

        minWidth:
          110
      },

      {
        headerName:
          'Cédula',

        field:
          'cedula',

        width:
          120,

        minWidth:
          110
      },

      {
        headerName:
          'Cod. Sectorial',

        field:
          'codigoSectorial',

        width:
          130,

        minWidth:
          115
      },

      {
        headerName:
          'Nombre',

        field:
          'empleado',

        width:
          270,

        minWidth:
          220
      },

      {
        headerName:
          'N.º Días',

        field:
          'diasTrabajados',

        width:
          90,

        minWidth:
          80,

        cellClass:
          'text-center'
      },

      {
        headerName:
          'Base Imponible',

        field:
          'baseImponible',

        width:
          135,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          'cell-money cell-base'
      },

      {
        headerName:
          'Imp. Renta Anual',

        field:
          'impuestoRentaAnual',

        width:
          145,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          'cell-money'
      },

      {
        headerName:
          'Rebaja',

        field:
          'rebaja',

        width:
          110,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          'cell-money cell-rebaja'
      },

      {
        headerName:
          'Impuesto Causado',

        field:
          'impuestoCausado',

        width:
          145,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          'cell-money cell-causado'
      },

      {
        headerName:
          'Impuesto Pagado',

        field:
          'impuestoPagado',

        width:
          145,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          'cell-money cell-pagado'
      },

      {
        headerName:
          'Diferencia',

        field:
          'diferencia',

        width:
          120,

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            ),

        cellClass:
          params => {

            const valor =
              Number(
                params.value
                ??
                0
              );

            if (valor > 0) {

              return (
                'cell-money ' +
                'cell-diferencia-positiva'
              );
            }

            if (valor < 0) {

              return (
                'cell-money ' +
                'cell-diferencia-negativa'
              );
            }

            return 'cell-money';
          }
      },

      {
        headerName:
          'Fecha Ing.',

        field:
          'fechaIngreso',

        width:
          115,

        valueFormatter:
          params =>
            this.formatearFecha(
              params.value
            )
      },

      {
        headerName:
          'Fecha Sal.',

        field:
          'fechaSalida',

        width:
          115,

        valueFormatter:
          params =>
            this.formatearFecha(
              params.value
            )
      },

      {
        headerName:
          'Cargas',

        field:
          'cargas',

        width:
          85,

        cellClass:
          'text-center'
      },

      {
        headerName:
          'G. Personal',

        field:
          'gastosPersonales',

        width:
          125,

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
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private readonly fb:
      FormBuilder,

    private readonly impuestoRentaService:
      ImpuestoRentaService,

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

        fechaPeriodo: [
          this.obtenerFinMesActual(),
          Validators.required
        ],

        idEmpresa: [
          this.usuarioActual?.id_empresa
          ??
          1,

          [
            Validators.required,
            Validators.min(1)
          ]
        ],

        idLocal: [
          null
        ],

        // ==============================================
        // EMPLEADO
        //
        // null = TODOS
        // ==============================================

        idEmpleado: [
          null
        ],

        empleadoBusqueda: [
          'TODOS'
        ]
      });
  }


  // ==========================================================
  // CONFIGURAR BUSQUEDA EMPLEADO
  // ==========================================================

  private configurarBusquedaEmpleado():
    void {

    this.form
      .get('empleadoBusqueda')
      ?.valueChanges
      .pipe(

        debounceTime(
          300
        ),

        distinctUntilChanged()

      )
      .subscribe(
        valor => {

          // ================================================
          // SI AUTOCOMPLETE DEVUELVE OBJETO
          // NO CONSULTAR NUEVAMENTE
          // ================================================

          if (
            typeof valor === 'object'
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


          // ================================================
          // SI ESCRIBE MANUALMENTE,
          // LIMPIAR ID SELECCIONADO
          // ================================================

          this.form
            .get('idEmpleado')
            ?.setValue(
              null,
              {
                emitEvent:
                  false
              }
            );


          // ================================================
          // TODOS
          // ================================================

          if (
            texto
              .toUpperCase()
            ===
            'TODOS'
          ) {

            this.cargarEmpleadosBusqueda(
              ''
            );

            return;
          }


          // ================================================
          // BUSCAR
          // ================================================

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
              'Error cargando empleados IR:',
              err
            );

            this.empleadosBusqueda =
              [];

            this.empleadosFiltrados =
              [];
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


    this.form.patchValue(
      {

        idEmpleado:
          Number(
            emp.idEmpleado
          ),

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
  }


  // ==========================================================
  // SELECCIONAR TODOS
  // ==========================================================

  seleccionarTodos():
    void {

    this.form.patchValue(
      {

        idEmpleado:
          null,

        empleadoBusqueda:
          'TODOS'

      },
      {
        emitEvent:
          false
      }
    );


    this.cargarEmpleadosBusqueda(
      ''
    );
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
  // LIMPIAR EMPLEADO
  // ==========================================================

  limpiarBusquedaEmpleado(
    event?:
      MouseEvent
  ): void {

    if (event) {

      event.preventDefault();

      event.stopPropagation();
    }


    this.seleccionarTodos();
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
  // CONSULTAR / CALCULAR
  // ==========================================================

  consultar():
    void {

    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();

      return;
    }


    const value =
      this.form
        .getRawValue();


    const request:
      CalcularImpuestoRentaRequest = {

      fechaPeriodo:
        value.fechaPeriodo,

      idEmpresa:
        Number(
          value.idEmpresa
        ),

      idLocal:
        this.numeroNullable(
          value.idLocal
        ),

      idEmpleado:
        this.numeroNullable(
          value.idEmpleado
        )
    };


    this.cargando =
      true;

    this.rowData =
      [];

    this.pinnedBottomRowData =
      [];


    this.impuestoRentaService
      .calcular(
        request
      )
      .subscribe({

        next:
          response => {

            this.cargando =
              false;


            if (
              response.type
                ?.toLowerCase()
              ===
              'error'
            ) {

              this.rowData =
                [];

              this.pinnedBottomRowData =
                [];


              alert(
                response.message
                ||
                'No fue posible calcular el Impuesto a la Renta.'
              );

              return;
            }


            this.rowData =
              response.data
              ??
              [];


            this.calcularTotales();
          },


        error:
          error => {

            this.cargando =
              false;

            this.rowData =
              [];

            this.pinnedBottomRowData =
              [];


            console.error(
              'Error Impuesto Renta:',
              error
            );


            alert(
              error?.error?.message
              ||
              'Error consultando Impuesto a la Renta.'
            );
          }

      });
  }


  // ==========================================================
  // GRABAR
  //
  // SOLO ABRE CONFIRMACION
  // ==========================================================

  grabar():
    void {

    if (
      this.rowData.length === 0
    ) {

      alert(
        'No existen datos para grabar.'
      );

      return;
    }


    if (
      this.guardando
      ||
      this.cargando
    ) {

      return;
    }


    this.tituloConfirmacion =
      'Confirmar grabación';


    this.mensajeConfirmacion =
      this.rowData.length === 1
        ? '¿Está seguro de grabar la información de Impuesto a la Renta del empleado seleccionado?'
        : `¿Está seguro de grabar la información de Impuesto a la Renta de ${this.rowData.length} empleados?`;


    this.textoAceptarConfirmacion =
      'Sí, grabar';


    this.accionConfirmacion =
      'GRABAR';


    this.mostrarConfirmacion =
      true;
  }


  // ==========================================================
  // GRABAR CONFIRMADO
  // ==========================================================

  private grabarConfirmado():
    void {

    const value =
      this.form
        .getRawValue();


    /*
     * Mantengo el valor que ya utilizabas.
     *
     * Cuando confirmemos el campo real del usuario
     * autenticado se reemplaza.
     */
    const idUsuario =
      1;


    const request:
      GrabarImpuestoRentaRequest = {

      fechaPeriodo:
        value.fechaPeriodo,

      idEmpresa:
        Number(
          value.idEmpresa
        ),

      idUsuario:
        idUsuario,

      empleados:
        this.rowData.map(
          item => ({

            idEmpleado:
              item.idEmpleado,

            idLocal:
              item.idLocal
              ??
              null,

            cedula:
              item.cedula
              ??
              '',

            numeroAfiliacion:
              item.numeroAfiliacion
              ??
              '',

            codigoSectorial:
              item.codigoSectorial
              ??
              '',

            diasTrabajados:
              Number(
                item.diasTrabajados
                ??
                0
              ),

            fechaIngreso:
              item.fechaIngreso
              ??
              null,

            fechaSalida:
              item.fechaSalida
              ??
              null,

            baseImponible:
              Number(
                item.baseImponible
                ??
                0
              ),

            impuestoRentaAnual:
              Number(
                item.impuestoRentaAnual
                ??
                0
              ),

            rebaja:
              Number(
                item.rebaja
                ??
                0
              ),

            impuestoCausado:
              Number(
                item.impuestoCausado
                ??
                0
              ),

            impuestoPagado:
              Number(
                item.impuestoPagado
                ??
                0
              ),

            diferencia:
              Number(
                item.diferencia
                ??
                0
              ),

            cargas:
              Number(
                item.cargas
                ??
                0
              ),

            gastosPersonales:
              Number(
                item.gastosPersonales
                ??
                0
              )
          })
        )
    };


    this.guardando =
      true;


    this.impuestoRentaService
      .grabar(
        request
      )
      .subscribe({

        next:
          response => {

            this.guardando =
              false;


            if (
              response.type
                ?.toLowerCase()
              ===
              'error'
              ||
              response.data !== true
            ) {

              alert(
                response.message
                ||
                'No fue posible grabar la información.'
              );

              return;
            }


            alert(
              response.message
              ||
              'Información grabada correctamente.'
            );
          },


        error:
          error => {

            this.guardando =
              false;


            console.error(
              'Error grabando IR:',
              error
            );


            let mensaje =
              'Error al grabar Impuesto a la Renta.';


            if (
              error?.error?.message
            ) {

              mensaje =
                error.error.message;
            }
            else if (
              error?.error?.errors
            ) {

              const errores =
                error.error.errors;


              mensaje =
                Object
                  .keys(
                    errores
                  )
                  .map(
                    key =>
                      `${key}: ${errores[key].join(', ')}`
                  )
                  .join('\n');
            }


            alert(
              mensaje
            );
          }

      });
  }


  // ==========================================================
  // GENERAR XML
  //
  // SOLO ABRE CONFIRMACION
  // ==========================================================

  generarXml():
    void {

    const value =
      this.form
        .getRawValue();


    if (
      !value.fechaPeriodo
    ) {

      alert(
        'Debe seleccionar un período.'
      );

      return;
    }


    if (
      !value.idEmpresa
      ||
      Number(
        value.idEmpresa
      ) <= 0
    ) {

      alert(
        'Debe seleccionar una empresa.'
      );

      return;
    }


    const anio =
      Number(
        value.fechaPeriodo.substring(
          0,
          4
        )
      );


    const idEmpleado =
      this.numeroNullable(
        value.idEmpleado
      );


    this.tituloConfirmacion =
      'Generar XML RDEP';


    if (
      idEmpleado !== null
    ) {

      this.mensajeConfirmacion =
        `¿Está seguro de generar el archivo RDEP${anio}.xml únicamente para el empleado seleccionado?`;
    }
    else {

      this.mensajeConfirmacion =
        `¿Está seguro de generar el archivo RDEP${anio}.xml para todos los empleados?`;
    }


    this.textoAceptarConfirmacion =
      'Sí, generar';


    this.accionConfirmacion =
      'XML';


    this.mostrarConfirmacion =
      true;
  }


  // ==========================================================
  // GENERAR XML CONFIRMADO
  // ==========================================================

  private generarXmlConfirmado():
    void {

    const value =
      this.form
        .getRawValue();


    const anio =
      Number(
        value.fechaPeriodo.substring(
          0,
          4
        )
      );


    const request:
      GenerarRdepRequest = {

      anio:
        anio,

      idEmpresa:
        Number(
          value.idEmpresa
        ),

      // ==============================================
      // null = TODOS
      // ID   = EMPLEADO SELECCIONADO
      // ==============================================

      idEmpleado:
        this.numeroNullable(
          value.idEmpleado
        )
    };


    console.log(
      'REQUEST XML RDEP:',
      request
    );


    this.generandoXml =
      true;


    this.impuestoRentaService
      .generarRdepXml(
        request
      )
      .subscribe({

        next:
          blob => {

            this.generandoXml =
              false;


            if (
              !blob
              ||
              blob.size === 0
            ) {

              alert(
                'El archivo XML generado está vacío.'
              );

              return;
            }


            const url =
              window.URL
                .createObjectURL(
                  blob
                );


            const link =
              document
                .createElement(
                  'a'
                );


            link.href =
              url;


            link.download =
              `RDEP${anio}.xml`;


            document.body
              .appendChild(
                link
              );


            link.click();


            document.body
              .removeChild(
                link
              );


            window.URL
              .revokeObjectURL(
                url
              );
          },


        error:
          async error => {

            this.generandoXml =
              false;


            console.error(
              'Error generando RDEP:',
              error
            );


            let mensaje =
              'Error al generar el archivo RDEP.';


            if (
              error?.error
              instanceof Blob
            ) {

              try {

                const texto =
                  await error.error
                    .text();


                const resultado =
                  JSON.parse(
                    texto
                  );


                mensaje =
                  resultado?.message
                  ||
                  mensaje;

              }
              catch {

                // Mantener mensaje genérico.
              }
            }


            alert(
              mensaje
            );
          }

      });
  }


  // ==========================================================
  // CONFIRMAR MODAL
  // ==========================================================

  confirmarAccion():
    void {

    const accion =
      this.accionConfirmacion;


    // Cerramos primero el modal.
    this.mostrarConfirmacion =
      false;


    this.accionConfirmacion =
      null;


    if (
      accion ===
      'GRABAR'
    ) {

      this.grabarConfirmado();

      return;
    }


    if (
      accion ===
      'XML'
    ) {

      this.generarXmlConfirmado();
    }
  }


  // ==========================================================
  // CANCELAR MODAL
  // ==========================================================

  cancelarConfirmacion():
    void {

    this.mostrarConfirmacion =
      false;


    this.accionConfirmacion =
      null;
  }


  // ==========================================================
  // LIMPIAR
  // ==========================================================

  limpiar():
    void {

    this.form.patchValue(
      {

        fechaPeriodo:
          this.obtenerFinMesActual(),

        idEmpresa:
          this.usuarioActual?.id_empresa
          ??
          1,

        idLocal:
          null,

        idEmpleado:
          null,

        empleadoBusqueda:
          'TODOS'

      },
      {
        emitEvent:
          false
      }
    );


    this.rowData =
      [];


    this.pinnedBottomRowData =
      [];


    this.gridApi
      ?.setFilterModel(
        null
      );


    this.cargarEmpleadosBusqueda(
      ''
    );
  }


  // ==========================================================
  // TOTALES
  // ==========================================================

  private calcularTotales():
    void {

    if (
      this.rowData.length === 0
    ) {

      this.pinnedBottomRowData =
        [];

      return;
    }


    this.pinnedBottomRowData = [
      {

        local:
          'TOTALES',

        numeroAfiliacion:
          '',

        cedula:
          '',

        codigoSectorial:
          '',

        empleado:
          '',

        diasTrabajados:
          this.sumar(
            'diasTrabajados'
          ),

        baseImponible:
          this.sumar(
            'baseImponible'
          ),

        impuestoRentaAnual:
          this.sumar(
            'impuestoRentaAnual'
          ),

        rebaja:
          this.sumar(
            'rebaja'
          ),

        impuestoCausado:
          this.sumar(
            'impuestoCausado'
          ),

        impuestoPagado:
          this.sumar(
            'impuestoPagado'
          ),

        diferencia:
          this.sumar(
            'diferencia'
          ),

        fechaIngreso:
          null,

        fechaSalida:
          null,

        cargas:
          this.sumar(
            'cargas'
          ),

        gastosPersonales:
          this.sumar(
            'gastosPersonales'
          )
      }
    ];
  }


  // ==========================================================
  // SUMAR
  // ==========================================================

  private sumar(
    campo:
      keyof ImpuestoRentaResponse
  ): number {

    return this.rowData
      .reduce(
        (
          total,
          item
        ) => {

          const valor =
            Number(
              item[campo]
              ??
              0
            );


          if (
            !Number.isFinite(
              valor
            )
          ) {

            return total;
          }


          return (
            total
            +
            valor
          );
        },
        0
      );
  }


  // ==========================================================
  // FORMATO NUMERO
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
      return '';
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
  // NUMERO NULLABLE
  // ==========================================================

  private numeroNullable(
    value:
      any
  ): number | null {

    if (
      value === null
      ||
      value === undefined
      ||
      value === ''
    ) {

      return null;
    }


    const numero =
      Number(
        value
      );


    if (
      !Number.isFinite(
        numero
      )
    ) {

      return null;
    }


    return numero;
  }


  // ==========================================================
  // FIN DE MES ACTUAL
  // ==========================================================

  private obtenerFinMesActual():
    string {

    const hoy =
      new Date();


    const fecha =
      new Date(
        hoy.getFullYear(),
        hoy.getMonth() + 1,
        0
      );


    const year =
      fecha.getFullYear();


    const month =
      String(
        fecha.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        fecha.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return (
      `${year}-${month}-${day}`
    );
  }


  // ==========================================================
  // IMPRIMIR
  // ==========================================================

  imprimir():
    void {

    if (
      this.rowData.length === 0
    ) {

      alert(
        'No existen datos para imprimir.'
      );

      return;
    }


    const value =
      this.form
        .getRawValue();


    if (
      !value.fechaPeriodo
    ) {

      alert(
        'Debe seleccionar un período.'
      );

      return;
    }


    // ========================================================
    // PERIODO
    // ========================================================

    const anio =
      Number(
        value.fechaPeriodo.substring(
          0,
          4
        )
      );


    const fechaDesde =
      `01/01/${anio}`;


    const fechaHasta =
      `31/12/${anio}`;


    // ========================================================
    // DOCUMENTO
    // ========================================================

    const doc =
      new jsPDF({

        orientation:
          'landscape',

        unit:
          'mm',

        format:
          'a4'

      });


    // ========================================================
    // CABECERA
    // ========================================================

    doc.setFont(
      'helvetica',
      'bold'
    );


    doc.setFontSize(
      14
    );


    doc.text(
      'IMPUESTO A LA RENTA',
      148.5,
      10,
      {
        align:
          'center'
      }
    );


    doc.setFontSize(
      10
    );


    doc.text(
      'NÓMINA ESPECIAL',
      148.5,
      15,
      {
        align:
          'center'
      }
    );


    doc.setFont(
      'helvetica',
      'normal'
    );


    doc.setFontSize(
      7
    );


    doc.text(
      `PERIODO DESDE: ${fechaDesde}   HASTA: ${fechaHasta}`,
      148.5,
      20,
      {
        align:
          'center'
      }
    );


    doc.text(
      `Empleados: ${this.rowData.length}`,
      5,
      25
    );


    // ========================================================
    // BODY
    // ========================================================

    const body =
      this.rowData.map(
        item => [

          item.local
          ??
          '',

          item.numeroAfiliacion
          ??
          '',

          item.cedula
          ??
          '',

          item.codigoSectorial
          ??
          '',

          item.empleado
          ??
          '',

          String(
            item.diasTrabajados
            ??
            0
          ),

          this.formatearNumeroPdf(
            item.baseImponible
          ),

          this.formatearNumeroPdf(
            item.impuestoRentaAnual
          ),

          this.formatearNumeroPdf(
            item.rebaja
          ),

          this.formatearNumeroPdf(
            item.impuestoCausado
          ),

          this.formatearNumeroPdf(
            item.impuestoPagado
          ),

          this.formatearNumeroPdf(
            item.diferencia
          ),

          this.formatearFecha(
            item.fechaIngreso
          ),

          this.formatearFecha(
            item.fechaSalida
          ),

          String(
            item.cargas
            ??
            0
          ),

          this.formatearNumeroPdf(
            item.gastosPersonales
          )

        ]
      );


    // ========================================================
    // FOOTER
    // ========================================================

    const footer = [
      [

        'TOTALES',

        '',

        '',

        '',

        '',

        this.formatearNumeroPdf(
          this.sumar(
            'diasTrabajados'
          ),
          0
        ),

        this.formatearNumeroPdf(
          this.sumar(
            'baseImponible'
          )
        ),

        this.formatearNumeroPdf(
          this.sumar(
            'impuestoRentaAnual'
          )
        ),

        this.formatearNumeroPdf(
          this.sumar(
            'rebaja'
          )
        ),

        this.formatearNumeroPdf(
          this.sumar(
            'impuestoCausado'
          )
        ),

        this.formatearNumeroPdf(
          this.sumar(
            'impuestoPagado'
          )
        ),

        this.formatearNumeroPdf(
          this.sumar(
            'diferencia'
          )
        ),

        '',

        '',

        this.formatearNumeroPdf(
          this.sumar(
            'cargas'
          ),
          0
        ),

        this.formatearNumeroPdf(
          this.sumar(
            'gastosPersonales'
          )
        )

      ]
    ];


    // ========================================================
    // TABLA
    // ========================================================

    autoTable(
      doc,
      {

        startY:
          28,


        head: [[

          'Local',

          'N.º Afiliación',

          'Cédula',

          'Cod. Sectorial',

          'Nombre',

          'N.º Días',

          'Base Imponible',

          'Imp. Renta Anual',

          'Rebaja',

          'Imp. Causado',

          'Imp. Pagado',

          'Diferencia',

          'Fecha Ing.',

          'Fecha Sal.',

          'Cargas',

          'G. Personal'

        ]],


        body:
          body,


        foot:
          footer,


        theme:
          'grid',


        margin: {

          left:
            4,

          right:
            4,

          top:
            10,

          bottom:
            10

        },


        styles: {

          font:
            'helvetica',

          fontSize:
            4.7,

          cellPadding:
            1,

          overflow:
            'linebreak',

          valign:
            'middle',

          lineWidth:
            0.1

        },


        headStyles: {

          fontStyle:
            'bold',

          fontSize:
            4.7,

          halign:
            'center',

          fillColor: [
            235,
            235,
            235
          ],

          textColor: [
            0,
            0,
            0
          ]

        },


        footStyles: {

          fontStyle:
            'bold',

          fontSize:
            4.7,

          fillColor: [
            235,
            235,
            235
          ],

          textColor: [
            0,
            0,
            0
          ]

        },


        columnStyles: {

          0: {
            cellWidth:
              18
          },

          1: {
            cellWidth:
              17
          },

          2: {
            cellWidth:
              17
          },

          3: {
            cellWidth:
              17
          },

          4: {
            cellWidth:
              42
          },

          5: {
            cellWidth:
              11,

            halign:
              'center'
          },

          6: {
            cellWidth:
              18,

            halign:
              'right'
          },

          7: {
            cellWidth:
              18,

            halign:
              'right'
          },

          8: {
            cellWidth:
              14,

            halign:
              'right'
          },

          9: {
            cellWidth:
              18,

            halign:
              'right'
          },

          10: {
            cellWidth:
              18,

            halign:
              'right'
          },

          11: {
            cellWidth:
              17,

            halign:
              'right'
          },

          12: {
            cellWidth:
              15,

            halign:
              'center'
          },

          13: {
            cellWidth:
              15,

            halign:
              'center'
          },

          14: {
            cellWidth:
              10,

            halign:
              'center'
          },

          15: {
            cellWidth:
              17,

            halign:
              'right'
          }

        },


        // ====================================================
        // PIE PAGINA
        // ====================================================

        didDrawPage:
          () => {

            const numeroPagina =
              doc.getNumberOfPages();


            doc.setFontSize(
              6
            );


            doc.setFont(
              'helvetica',
              'normal'
            );


            doc.text(
              `ROL3000 - Impuesto a la Renta ${anio}`,
              5,
              205
            );


            doc.text(
              `Página ${numeroPagina}`,
              292,
              205,
              {
                align:
                  'right'
              }
            );
          }

      }
    );


    // ========================================================
    // ABRIR PDF
    // ========================================================

    const pdfBlob =
      doc.output(
        'blob'
      );


    const pdfUrl =
      URL.createObjectURL(
        pdfBlob
      );


    const ventana =
      window.open(
        pdfUrl,
        '_blank'
      );


    if (!ventana) {

      URL.revokeObjectURL(
        pdfUrl
      );


      alert(
        'El navegador bloqueó la apertura del PDF.'
      );
    }
  }


  // ==========================================================
  // FORMATO NUMERO PDF
  // ==========================================================

  private formatearNumeroPdf(
    value:
      any,

    decimales:
      number = 2
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

      return decimales === 0
        ? '0'
        : '0.00';
    }


    return numero
      .toLocaleString(
        'en-US',
        {

          minimumFractionDigits:
            decimales,

          maximumFractionDigits:
            decimales

        }
      );
  }
}