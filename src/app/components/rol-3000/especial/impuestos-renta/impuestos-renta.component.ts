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
  GenerarRdepRequest,
  GrabarImpuestoRentaRequest,
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

  usuarioActual =
    this.usuarioService.getUsuarioActual();

  form!: FormGroup;

  cargando = false;
  guardando = false;
  generandoXml = false;
  cargandoEmpleados = false;

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

  textoCancelarConfirmacion = 'Cancelar';

  accionConfirmacion:
    'GRABAR' |
    'XML' |
    'EXISTENTE' |
    null = null;

  private datosGuardadosPendientes:
    ImpuestoRentaResponse[] = [];

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

  defaultColDef:
    ColDef = {
      sortable: true,
      filter: true,
      resizable: true
    };

  columnDefs:
    ColDef[] = [

      {
        headerName: 'Local',
        field: 'local',
        width: 165,
        minWidth: 140,
        pinned: 'left'
      },

      {
        headerName: 'N.º Afiliación',
        field: 'numeroAfiliacion',
        width: 125
      },

      {
        headerName: 'Cédula',
        field: 'cedula',
        width: 120
      },

      {
        headerName: 'Cod. Sectorial',
        field: 'codigoSectorial',
        width: 130
      },

      {
        headerName: 'Nombre',
        field: 'empleado',
        width: 270
      },

      {
        headerName: 'N.º Días',
        field: 'diasTrabajados',
        width: 90,
        cellClass: 'text-center'
      },

      {
        headerName: 'Base Imponible',
        field: 'baseImponible',
        width: 135,
        valueFormatter:
          params =>
            this.formatearNumero(params.value),
        cellClass:
          'cell-money cell-base'
      },

      {
        headerName: 'Imp. Renta Anual',
        field: 'impuestoRentaAnual',
        width: 145,
        valueFormatter:
          params =>
            this.formatearNumero(params.value),
        cellClass:
          'cell-money'
      },

      {
        headerName: 'Rebaja',
        field: 'rebaja',
        width: 110,
        valueFormatter:
          params =>
            this.formatearNumero(params.value),
        cellClass:
          'cell-money cell-rebaja'
      },

      {
        headerName: 'Impuesto Causado',
        field: 'impuestoCausado',
        width: 145,
        valueFormatter:
          params =>
            this.formatearNumero(params.value),
        cellClass:
          'cell-money cell-causado'
      },

      {
        headerName: 'Impuesto Pagado',
        field: 'impuestoPagado',
        width: 145,
        valueFormatter:
          params =>
            this.formatearNumero(params.value),
        cellClass:
          'cell-money cell-pagado'
      },

      {
        headerName: 'Diferencia',
        field: 'diferencia',
        width: 120,
        valueFormatter:
          params =>
            this.formatearNumero(params.value),
        cellClass:
          params => {

            const valor =
              Number(params.value ?? 0);

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
        headerName: 'Fecha Ing.',
        field: 'fechaIngreso',
        width: 115,
        valueFormatter:
          params =>
            this.formatearFecha(params.value)
      },

      {
        headerName: 'Fecha Sal.',
        field: 'fechaSalida',
        width: 115,
        valueFormatter:
          params =>
            this.formatearFecha(params.value)
      },

      {
        headerName: 'Cargas',
        field: 'cargas',
        width: 85,
        cellClass: 'text-center'
      },

      {
        headerName: 'G. Personal',
        field: 'gastosPersonales',
        width: 125,
        valueFormatter:
          params =>
            this.formatearNumero(params.value),
        cellClass:
          'cell-money'
      }
    ];


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


  ngOnInit(): void {

    this.crearFormulario();

    this.configurarModificarPeriodo();

    this.configurarBusquedaEmpleado();

    this.cargarEmpleadosBusqueda('');
  }


  // ==========================================================
  // FORMULARIO
  // ==========================================================

  private crearFormulario(): void {

    const anio =
      new Date().getFullYear();

    this.form =
      this.fb.group({

        fechaDesde: [
          `${anio}-01-01`,
          Validators.required
        ],

        fechaHasta: [
          `${anio}-12-31`,
          Validators.required
        ],

        modificarPeriodo: [
          false
        ],

        idEmpresa: [
          this.usuarioActual?.id_empresa ?? 1,
          [
            Validators.required,
            Validators.min(1)
          ]
        ],

        idLocal: [
          null
        ],

        idEmpleado: [
          null
        ],

        empleadoBusqueda: [
          'TODOS'
        ]
      });

    this.form
      .get('fechaDesde')
      ?.disable({
        emitEvent: false
      });

    this.form
      .get('fechaHasta')
      ?.disable({
        emitEvent: false
      });
  }


  private configurarModificarPeriodo(): void {

    this.form
      .get('modificarPeriodo')
      ?.valueChanges
      .subscribe(
        modificar => {

          const desde =
            this.form.get('fechaDesde');

          const hasta =
            this.form.get('fechaHasta');

          if (modificar) {

            desde?.enable({
              emitEvent: false
            });

            hasta?.enable({
              emitEvent: false
            });

            return;
          }

          const fechaHastaActual =
            hasta?.value;

          let anio =
            new Date().getFullYear();

          if (
            fechaHastaActual &&
            fechaHastaActual.length >= 4
          ) {

            const valorAnio =
              Number(
                fechaHastaActual.substring(
                  0,
                  4
                )
              );

            if (
              Number.isFinite(valorAnio)
            ) {
              anio = valorAnio;
            }
          }

          desde?.setValue(
            `${anio}-01-01`,
            {
              emitEvent: false
            }
          );

          hasta?.setValue(
            `${anio}-12-31`,
            {
              emitEvent: false
            }
          );

          desde?.disable({
            emitEvent: false
          });

          hasta?.disable({
            emitEvent: false
          });
        }
      );
  }


  // ==========================================================
  // EMPLEADOS
  // ==========================================================

  private configurarBusquedaEmpleado(): void {

    this.form
      .get('empleadoBusqueda')
      ?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(
        valor => {

          if (
            typeof valor === 'object' &&
            valor !== null
          ) {
            return;
          }

          const texto =
            (valor ?? '')
              .toString()
              .trim();

          this.form
            .get('idEmpleado')
            ?.setValue(
              null,
              {
                emitEvent: false
              }
            );

          if (
            texto.toUpperCase() ===
            'TODOS'
          ) {

            this.cargarEmpleadosBusqueda('');

            return;
          }

          this.cargarEmpleadosBusqueda(
            texto
          );
        }
      );
  }


  cargarEmpleadosBusqueda(
    texto: string = ''
  ): void {

    this.cargandoEmpleados =
      true;

    this.empleadoFichaService
      .getBusqueda(texto)
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
              resp.data ?? [];

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
          Number(emp.idEmpleado),

        empleadoBusqueda:
          emp.nombreCompleto ?? ''
      },
      {
        emitEvent: false
      }
    );
  }


  seleccionarTodos(): void {

    this.form.patchValue(
      {
        idEmpleado:
          null,

        empleadoBusqueda:
          'TODOS'
      },
      {
        emitEvent: false
      }
    );

    this.cargarEmpleadosBusqueda('');
  }


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
      empleado.nombreCompleto ?? ''
    );
  }


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
  // GRID
  // ==========================================================

  onGridReady(
    event:
      GridReadyEvent
  ): void {

    this.gridApi =
      event.api;
  }


  // ==========================================================
  // VALIDAR PERIODO
  // ==========================================================

  private validarPeriodo(): boolean {

    const value =
      this.form.getRawValue();

    if (
      !value.fechaDesde ||
      !value.fechaHasta
    ) {

      alert(
        'Debe seleccionar el período.'
      );

      return false;
    }

    if (
      value.fechaDesde >
      value.fechaHasta
    ) {

      alert(
        'La fecha desde no puede ser mayor que la fecha hasta.'
      );

      return false;
    }

    const anioDesde =
      Number(
        value.fechaDesde.substring(
          0,
          4
        )
      );

    const anioHasta =
      Number(
        value.fechaHasta.substring(
          0,
          4
        )
      );

    if (
      anioDesde !==
      anioHasta
    ) {

      alert(
        'El período debe pertenecer al mismo año.'
      );

      return false;
    }

    return true;
  }


  // ==========================================================
  // CALCULAR
  // ==========================================================

  consultar(): void {

    this.ejecutarCalculo(
      false
    );
  }


  private ejecutarCalculo(
    forzarRecalculo:
      boolean
  ): void {

    if (
      !this.validarPeriodo()
    ) {
      return;
    }

    const value =
      this.form.getRawValue();

    const request:
      CalcularImpuestoRentaRequest = {

      fechaDesde:
        value.fechaDesde,

      fechaHasta:
        value.fechaHasta,

      idEmpresa:
        Number(value.idEmpresa),

      idLocal:
        this.numeroNullable(
          value.idLocal
        ),

      idEmpleado:
        this.numeroNullable(
          value.idEmpleado
        ),

      forzarRecalculo:
        forzarRecalculo
    };

    console.log(
      'REQUEST CALCULAR IR:',
      request
    );

    this.cargando =
      true;

    this.rowData =
      [];

    this.pinnedBottomRowData =
      [];

    this.impuestoRentaService
      .calcular(request)
      .subscribe({

        next:
          response => {

            this.cargando =
              false;

            const tipo =
              response.type
                ?.toLowerCase();

            // ===============================================
            // INFORMACION YA EXISTENTE
            // ===============================================

            if (
              tipo ===
              'existing'
            ) {

              this.datosGuardadosPendientes =
                response.data ?? [];

              this.tituloConfirmacion =
                'Información existente';

              this.mensajeConfirmacion =
                'Actualmente ya existe información generada del período solicitado.';

              this.textoAceptarConfirmacion =
                'Sí, recalcular';

              this.textoCancelarConfirmacion =
                'No, recuperar';

              this.accionConfirmacion =
                'EXISTENTE';

              this.mostrarConfirmacion =
                true;

              return;
            }

            // ===============================================
            // ERROR
            // ===============================================

            if (
              tipo ===
              'error'
            ) {

              alert(
                response.message
                ||
                'No fue posible calcular el Impuesto a la Renta.'
              );

              return;
            }

            // ===============================================
            // RESULTADO NUEVO
            // ===============================================

            this.rowData =
              response.data ?? [];

            this.calcularTotales();
          },

        error:
          error => {

            this.cargando =
              false;

            console.error(
              'Error IR:',
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
  // ==========================================================

  grabar(): void {

    if (
      this.rowData.length === 0
    ) {

      alert(
        'No existen datos para grabar.'
      );

      return;
    }

    if (
      this.cargando ||
      this.guardando
    ) {
      return;
    }

    this.tituloConfirmacion =
      'Confirmar grabación';

    this.mensajeConfirmacion =
      this.rowData.length === 1
        ? '¿Está seguro de grabar la información del empleado seleccionado?'
        : `¿Está seguro de grabar la información de ${this.rowData.length} empleados?`;

    this.textoAceptarConfirmacion =
      'Sí, grabar';

    this.textoCancelarConfirmacion =
      'Cancelar';

    this.accionConfirmacion =
      'GRABAR';

    this.mostrarConfirmacion =
      true;
  }


  private grabarConfirmado(): void {

    const value =
      this.form.getRawValue();

    const request:
      GrabarImpuestoRentaRequest = {

      // GrabarAsync continúa trabajando con FechaPeriodo.
      fechaPeriodo:
        value.fechaHasta,

      idEmpresa:
        Number(value.idEmpresa),

      idUsuario:
        Number(
          this.usuarioActual?.id_usuario
          ??
          1
        ),

      empleados:
        this.rowData.map(
          item => ({

            idEmpleado:
              item.idEmpleado,

            idLocal:
              item.idLocal ?? null,

            cedula:
              item.cedula ?? '',

            numeroAfiliacion:
              item.numeroAfiliacion ?? '',

            codigoSectorial:
              item.codigoSectorial ?? '',

            diasTrabajados:
              Number(
                item.diasTrabajados ?? 0
              ),

            fechaIngreso:
              item.fechaIngreso ?? null,

            fechaSalida:
              item.fechaSalida ?? null,

            baseImponible:
              Number(
                item.baseImponible ?? 0
              ),

            impuestoRentaAnual:
              Number(
                item.impuestoRentaAnual ?? 0
              ),

            rebaja:
              Number(
                item.rebaja ?? 0
              ),

            impuestoCausado:
              Number(
                item.impuestoCausado ?? 0
              ),

            impuestoPagado:
              Number(
                item.impuestoPagado ?? 0
              ),

            diferencia:
              Number(
                item.diferencia ?? 0
              ),

            cargas:
              Number(
                item.cargas ?? 0
              ),

            gastosPersonales:
              Number(
                item.gastosPersonales ?? 0
              )
          })
        )
    };

    this.guardando =
      true;

    this.impuestoRentaService
      .grabar(request)
      .subscribe({

        next:
          response => {

            this.guardando =
              false;

            if (
              response.type
                ?.toLowerCase() ===
                'error'
              ||
              response.data !== true
            ) {

              alert(
                response.message
                ||
                'No fue posible grabar.'
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

            alert(
              error?.error?.message
              ||
              'Error grabando Impuesto a la Renta.'
            );
          }

      });
  }


  // ==========================================================
  // XML
  // ==========================================================

  generarXml(): void {

    if (
      !this.validarPeriodo()
    ) {
      return;
    }

    const value =
      this.form.getRawValue();

    const anio =
      Number(
        value.fechaHasta.substring(
          0,
          4
        )
      );

    this.tituloConfirmacion =
      'Generar XML RDEP';

    this.mensajeConfirmacion =
      this.numeroNullable(
        value.idEmpleado
      ) !== null
        ? `¿Desea generar RDEP${anio}.xml para el empleado seleccionado?`
        : `¿Desea generar RDEP${anio}.xml para todos los empleados?`;

    this.textoAceptarConfirmacion =
      'Sí, generar';

    this.textoCancelarConfirmacion =
      'Cancelar';

    this.accionConfirmacion =
      'XML';

    this.mostrarConfirmacion =
      true;
  }


  private generarXmlConfirmado(): void {

    const value =
      this.form.getRawValue();

    const anio =
      Number(
        value.fechaHasta.substring(
          0,
          4
        )
      );

    const request:
      GenerarRdepRequest = {

      anio:
        anio,

      idEmpresa:
        Number(value.idEmpresa),

      idEmpleado:
        this.numeroNullable(
          value.idEmpleado
        )
    };

    this.generandoXml =
      true;

    this.impuestoRentaService
      .generarRdepXml(request)
      .subscribe({

        next:
          blob => {

            this.generandoXml =
              false;

            if (
              !blob ||
              blob.size === 0
            ) {

              alert(
                'El archivo XML está vacío.'
              );

              return;
            }

            const url =
              window.URL
                .createObjectURL(blob);

            const link =
              document
                .createElement('a');

            link.href =
              url;

            link.download =
              `RDEP${anio}.xml`;

            document.body
              .appendChild(link);

            link.click();

            document.body
              .removeChild(link);

            window.URL
              .revokeObjectURL(url);
          },

        error:
          async error => {

            this.generandoXml =
              false;

            let mensaje =
              'Error al generar el RDEP.';

            if (
              error?.error
              instanceof Blob
            ) {

              try {

                const texto =
                  await error.error.text();

                const resultado =
                  JSON.parse(texto);

                mensaje =
                  resultado?.message
                  ||
                  mensaje;

              }
              catch {
              }
            }

            alert(mensaje);
          }

      });
  }


  // ==========================================================
  // CONFIRMACION
  // ==========================================================

  confirmarAccion(): void {

    const accion =
      this.accionConfirmacion;

    this.mostrarConfirmacion =
      false;

    this.accionConfirmacion =
      null;

    // "SI" DEL LEGACY:
    // recalcular ignorando lo almacenado.
    if (
      accion ===
      'EXISTENTE'
    ) {

      this.datosGuardadosPendientes =
        [];

      this.textoCancelarConfirmacion =
        'Cancelar';

      this.ejecutarCalculo(
        true
      );

      return;
    }

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


  cancelarConfirmacion(): void {

    const accion =
      this.accionConfirmacion;

    this.mostrarConfirmacion =
      false;

    this.accionConfirmacion =
      null;

    // "NO" DEL LEGACY:
    // recuperar los datos almacenados.
    if (
      accion ===
      'EXISTENTE'
    ) {

      this.rowData =
        [
          ...this.datosGuardadosPendientes
        ];

      this.datosGuardadosPendientes =
        [];

      this.calcularTotales();
    }

    this.textoCancelarConfirmacion =
      'Cancelar';
  }


  // ==========================================================
  // LIMPIAR
  // ==========================================================

  limpiar(): void {

    const anio =
      new Date().getFullYear();

    this.form.patchValue(
      {
        fechaDesde:
          `${anio}-01-01`,

        fechaHasta:
          `${anio}-12-31`,

        modificarPeriodo:
          false,

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
        emitEvent: false
      }
    );

    this.form
      .get('fechaDesde')
      ?.disable({
        emitEvent: false
      });

    this.form
      .get('fechaHasta')
      ?.disable({
        emitEvent: false
      });

    this.rowData =
      [];

    this.pinnedBottomRowData =
      [];

    this.datosGuardadosPendientes =
      [];

    this.gridApi
      ?.setFilterModel(null);

    this.cargarEmpleadosBusqueda('');
  }


  // ==========================================================
  // TOTALES
  // ==========================================================

  private calcularTotales(): void {

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

          const numero =
            Number(
              item[campo] ?? 0
            );

          return Number.isFinite(
            numero
          )
            ? total + numero
            : total;
        },
        0
      );
  }


  // ==========================================================
  // FORMATOS
  // ==========================================================

  formatearNumero(
    value:
      any
  ): string {

    const numero =
      Number(value ?? 0);

    return Number.isFinite(numero)
      ? numero.toLocaleString(
          'en-US',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        )
      : '0.00';
  }


  formatearFecha(
    value:
      string |
      null |
      undefined
  ): string {

    if (!value) {
      return '';
    }

    const fecha =
      value.substring(0, 10);

    const partes =
      fecha.split('-');

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


  private numeroNullable(
    value:
      any
  ): number | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numero =
      Number(value);

    return Number.isFinite(numero)
      ? numero
      : null;
  }


  // ==========================================================
  // IMPRIMIR
  // ==========================================================

  imprimir(): void {

    if (
      this.rowData.length === 0
    ) {

      alert(
        'No existen datos para imprimir.'
      );

      return;
    }

    const value =
      this.form.getRawValue();

    const fechaDesde =
      this.formatearFecha(
        value.fechaDesde
      );

    const fechaHasta =
      this.formatearFecha(
        value.fechaHasta
      );

    const anio =
      Number(
        value.fechaHasta.substring(
          0,
          4
        )
      );

    const doc =
      new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(14);

    doc.text(
      'IMPUESTO A LA RENTA',
      148.5,
      10,
      {
        align: 'center'
      }
    );

    doc.setFontSize(10);

    doc.text(
      'NÓMINA ESPECIAL',
      148.5,
      15,
      {
        align: 'center'
      }
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(7);

    doc.text(
      `PERIODO DESDE: ${fechaDesde}   HASTA: ${fechaHasta}`,
      148.5,
      20,
      {
        align: 'center'
      }
    );

    const body =
      this.rowData.map(
        item => [

          item.local ?? '',

          item.numeroAfiliacion ?? '',

          item.cedula ?? '',

          item.codigoSectorial ?? '',

          item.empleado ?? '',

          String(
            item.diasTrabajados ?? 0
          ),

          this.formatearNumero(
            item.baseImponible
          ),

          this.formatearNumero(
            item.impuestoRentaAnual
          ),

          this.formatearNumero(
            item.rebaja
          ),

          this.formatearNumero(
            item.impuestoCausado
          ),

          this.formatearNumero(
            item.impuestoPagado
          ),

          this.formatearNumero(
            item.diferencia
          ),

          this.formatearFecha(
            item.fechaIngreso
          ),

          this.formatearFecha(
            item.fechaSalida
          ),

          String(
            item.cargas ?? 0
          ),

          this.formatearNumero(
            item.gastosPersonales
          )
        ]
      );

    autoTable(
      doc,
      {
        startY: 28,

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

        theme:
          'grid',

        styles: {
          fontSize: 4.7,
          cellPadding: 1
        },

        didDrawPage:
          () => {

            doc.setFontSize(6);

            doc.text(
              `ROL3000 - Impuesto a la Renta ${anio}`,
              5,
              205
            );
          }
      }
    );

    const pdfBlob =
      doc.output('blob');

    const pdfUrl =
      URL.createObjectURL(
        pdfBlob
      );

    window.open(
      pdfUrl,
      '_blank'
    );
  }
}
