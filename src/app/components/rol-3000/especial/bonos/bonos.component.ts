import {
  Component,
  OnInit
} from '@angular/core';

import {
  MatDialog
} from '@angular/material/dialog';

import {
  DialogBancoNominaComponent,
  DialogBancoNominaResult
} from '../../nomina/dialog-banco-nomina/dialog-banco-nomina.component';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  CellValueChangedEvent,
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';

import {
  UsuarioService
} from 'src/app/services/usuario.service';

import {
  BancoBonosRequest,
  BonoEmpleadoDetalleResponse,
  BonoEmpleadoResponse,
  BonosService,
  CalcularBonosRequest,
  ConsultarBonosRequest,
  GuardarBonosRequest,
  RegionBono,
  TipoBono
} from 'src/app/services/rol/bonos.service';


@Component({
  selector: 'app-bonos',
  templateUrl: './bonos.component.html',
  styleUrls: ['./bonos.component.css']
})
export class BonosComponent implements OnInit {

  // ==========================================================
  // USUARIO / EMPRESA
  // ==========================================================

  usuarioActual: any = null;

  idEmpresa: number = 0;

  idUsuario: number | null = null;

  numeroPatronal: string = '';

  nombreEmpresa: string = '';


  // ==========================================================
  // FORMULARIO
  // ==========================================================

  form!: FormGroup;


  // ==========================================================
  // ESTADO
  // ==========================================================

  cargando: boolean = false;

  generado: boolean = false;

  mensaje: string = '';
  procesandoBanco: boolean = false;
  tipoMensaje:
    'success' |
    'error' |
    'info' = 'info';

  fechaDesde: string | null = null;

  fechaHasta: string | null = null;


  // ==========================================================
  // GRID
  // ==========================================================

  rowData:
    BonoEmpleadoDetalleResponse[] = [];

  private gridApi?: GridApi;

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  columnDefs: ColDef[] = [];


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
     private readonly fb: FormBuilder,
  private readonly bonosService: BonosService,
  private readonly usuarioService: UsuarioService,
  private readonly dialog: MatDialog
  ) {
  }


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.cargarUsuarioActual();

    this.form =
      this.fb.group({

        fechaPeriodo: [
          this.obtenerUltimoDiaMes(),
          Validators.required
        ],

        tipo: [
          'BD',
          Validators.required
        ],

        region: [
          'S',
          Validators.required
        ]

      });

    this.crearColumnas();

    // Si cambia el tipo, no recalculamos automáticamente.
    this.form
      .get('tipo')
      ?.valueChanges
      .subscribe(() => {

        this.limpiarResultados();
        this.crearColumnas();

      });

    // Si cambia la región, no recalculamos automáticamente.
    this.form
      .get('region')
      ?.valueChanges
      .subscribe(() => {

        this.limpiarResultados();

      });

    // Si cambia el período, no recalculamos automáticamente.
    this.form
      .get('fechaPeriodo')
      ?.valueChanges
      .subscribe(() => {

        this.limpiarResultados();

      });

    /*
     * IMPORTANTE:
     * NO se llama a calcular() aquí.
     * La información se carga únicamente cuando el usuario
     * presiona CALCULAR.
     */
  }


  // ==========================================================
  // USUARIO ACTUAL
  // ==========================================================

  private cargarUsuarioActual(): void {

    this.usuarioActual =
      this.usuarioService
        .getUsuarioActual();

    if (!this.usuarioActual) {

      this.idEmpresa = 0;
      this.idUsuario = null;

      return;
    }

    this.idEmpresa =
      Number(
        this.usuarioActual.id_empresa ??
        this.usuarioActual.idEmpresa ??
        0
      );

    const usuario =
      Number(
        this.usuarioActual.id_usuario ??
        this.usuarioActual.idUsuario ??
        0
      );

    this.idUsuario =
      usuario > 0
        ? usuario
        : null;

    this.numeroPatronal =
      String(
        this.usuarioActual.numeroPatronal ??
        this.usuarioActual.numero_patronal ??
        this.usuarioActual.numPatronal ??
        this.usuarioActual.numpatronal ??
        ''
      );

    this.nombreEmpresa =
      String(
        this.usuarioActual.nombreEmpresa ??
        this.usuarioActual.nombre_empresa ??
        this.usuarioActual.empresa ??
        this.usuarioActual.razonSocial ??
        this.usuarioActual.razon_social ??
        ''
      );
  }


  // ==========================================================
  // COLUMNAS GRID
  // ==========================================================

  crearColumnas(): void {

    let tituloBono =
      'Bono Empleado';

    if (this.tipoBono === 'BH') {

      tituloBono =
        'Bono Hijos';

    }

    if (this.tipoBono === 'BE') {

      tituloBono =
        'Bono Estudiantil';

    }

    this.columnDefs = [

      {
        headerName: 'Local',
        field: 'local',
        minWidth: 145
      },

      {
        headerName: 'Nº. Afiliación',
        field: 'numeroAfiliacion',
        width: 120
      },

      {
        headerName: 'Cédula',
        field: 'cedula',
        width: 115
      },

      {
        headerName: 'Cod. Sectorial',
        field: 'codigoSectorial',
        width: 120
      },

      {
        headerName: 'Nombre',
        field: 'nombreEmpleado',
        minWidth: 280,
        flex: 1
      },

      {
        headerName: 'Nº. Días',
        field: 'numeroDias',
        width: 90,
        type: 'numericColumn'
      },

      {
        headerName: tituloBono,
        field: 'valor',
        width: 120,
        type: 'numericColumn',

        valueFormatter: params =>
          this.formatearNumero(
            params.value
          )
      },

      {
        headerName: 'Fecha Ing.',
        field: 'fechaIngreso',
        width: 115,

        valueFormatter: params =>
          this.formatearFecha(
            params.value
          )
      },

      {
        headerName: 'Cargas',
        field: 'cargas',
        width: 80,
        type: 'numericColumn'
      },

      {
        headerName: 'Observaciones',
        field: 'observacion',
        minWidth: 180,
        editable: true
      },

      {
        headerName: 'Descuento',
        field: 'descuento',
        width: 110,
        editable: true,
        type: 'numericColumn',

        valueParser: params =>
          this.convertirNumero(
            params.newValue
          ),

        valueFormatter: params =>
          this.formatearNumero(
            params.value
          ),

        cellClass:
          'celda-editable'
      },

      {
        headerName: 'Líquido a Recibir',
        field: 'liquidoRecibir',
        width: 145,
        type: 'numericColumn',

        valueFormatter: params =>
          this.formatearNumero(
            params.value
          )
      }

    ];
  }


  // ==========================================================
  // GRID READY
  // ==========================================================

  onGridReady(
    event: GridReadyEvent
  ): void {

    this.gridApi =
      event.api;

    this.gridApi
      .sizeColumnsToFit();
  }


  // ==========================================================
  // CAMBIO DE CELDA
  // ==========================================================

  onCellValueChanged(
    event: CellValueChangedEvent
  ): void {

    if (!event.data) {
      return;
    }

    const item:
      BonoEmpleadoDetalleResponse =
        event.data;

    if (
      event.colDef.field !==
      'descuento'
    ) {

      return;
    }

    let descuento =
      this.convertirNumero(
        item.descuento
      );

    const valor =
      this.convertirNumero(
        item.valor
      );

    if (descuento < 0) {

      descuento = 0;

    }

    if (descuento > valor) {

      descuento = 0;

      this.mostrarMensaje(
        'El descuento no puede ser mayor al valor del bono.',
        'error'
      );
    }

    item.descuento =
      this.redondear(
        descuento
      );

    item.liquidoRecibir =
      this.redondear(
        valor -
        item.descuento
      );

    event.api
      .refreshCells({

        rowNodes: [
          event.node
        ],

        columns: [
          'descuento',
          'liquidoRecibir'
        ],

        force: true

      });

    this.rowData = [
      ...this.rowData
    ];
  }


  // ==========================================================
  // CALCULAR
  // ==========================================================

  calcular(
    forzarRecalculo:
      boolean = false
  ): void {

    this.mensaje = '';

    if (
      !this.validarEmpresa()
    ) {

      return;
    }

    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();

      this.mostrarMensaje(
        'Seleccione período, tipo de bono y región.',
        'error'
      );

      return;
    }

    const fechaPeriodo =
      String(
        this.form
          .get('fechaPeriodo')
          ?.value ??
        ''
      );

    if (!fechaPeriodo) {

      this.mostrarMensaje(
        'Seleccione el período.',
        'error'
      );

      return;
    }

    const request:
      CalcularBonosRequest = {

        idEmpresa:
          this.idEmpresa,

        fechaPeriodo:
          fechaPeriodo,

        tipo:
          this.tipoBono,

        region:
          this.regionBono,

        idLocal:
          null,

        idEmpleado:
          null,

        forzarRecalculo:
          forzarRecalculo
      };

    this.cargando =
      true;

    this.bonosService
      .calcular(request)
      .subscribe({

        next: response => {

          this.cargando =
            false;

          if (
            !response ||
            response.type
              ?.toLowerCase() !==
              'success'
          ) {

            this.rowData = [];
            this.generado = false;

            this.mostrarMensaje(
              response?.message ||
              'No fue posible calcular los bonos.',
              'error'
            );

            return;
          }

          if (
            !response.data
          ) {

            this.rowData = [];
            this.generado = false;

            this.mostrarMensaje(
              'El servidor no devolvió información.',
              'error'
            );

            return;
          }

          this.cargarRespuesta(
            response.data
          );

          if (
            this.rowData.length === 0
          ) {

            this.mostrarMensaje(
              'No se encontraron empleados para el período seleccionado.',
              'info'
            );

            return;
          }

          this.mostrarMensaje(
            response.message ||
            `${this.rowData.length} empleados cargados correctamente.`,
            'success'
          );
        },

        error: error => {

          this.cargando =
            false;

          this.rowData = [];
          this.generado = false;

          console.error(
            'ERROR BONOS:',
            error
          );

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error
            ),
            'error'
          );
        }

      });
  }


  // ==========================================================
  // GUARDAR
  // ==========================================================

  grabar(): void {

    if (
      this.generado
    ) {

      this.mostrarMensaje(
        'El período ya se encuentra generado.',
        'info'
      );

      return;
    }

    if (
      !this.validarEmpresa()
    ) {

      return;
    }

    if (
      this.rowData.length === 0
    ) {

      this.mostrarMensaje(
        'No existen registros para grabar.',
        'error'
      );

      return;
    }

    const confirmar =
      confirm(
        '¿Grabar información de bonos?'
      );

    if (
      !confirmar
    ) {

      return;
    }

    const fechaPeriodo =
      String(
        this.form
          .get('fechaPeriodo')
          ?.value ??
        ''
      );

    if (
      !fechaPeriodo
    ) {

      this.mostrarMensaje(
        'Seleccione el período.',
        'error'
      );

      return;
    }

    const request:
      GuardarBonosRequest = {

        idEmpresa:
          this.idEmpresa,

        fechaPeriodo:
          fechaPeriodo,

        tipo:
          this.tipoBono,

        region:
          this.regionBono,

        idUsuario:
          this.idUsuario,

        detalles:
          this.rowData
            .map(item => ({

              idEmpleado:
                item.idEmpleado,

              idLocal:
                item.idLocal ??
                null,

              numeroDias:
                this.convertirNumero(
                  item.numeroDias
                ),

              fechaIngreso:
                item.fechaIngreso ??
                null,

              fechaSalida:
                item.fechaSalida ??
                null,

              valor:
                this.redondear(
                  this.convertirNumero(
                    item.valor
                  )
                ),

              cargas:
                this.convertirNumero(
                  item.cargas
                ),

              descuento:
                this.redondear(
                  this.convertirNumero(
                    item.descuento
                  )
                ),

              observacion:
                item.observacion
                  ?.trim() ||
                null

            }))
      };

    this.cargando =
      true;

    this.bonosService
      .guardar(request)
      .subscribe({

        next: response => {

          this.cargando =
            false;

          if (
            !response ||
            response.type
              ?.toLowerCase() !==
              'success' ||
            response.data !== true
          ) {

            this.mostrarMensaje(
              response?.message ||
              'No se pudieron guardar los bonos.',
              'error'
            );

            return;
          }

          this.generado =
            true;

          this.mostrarMensaje(
            response.message ||
            'Los datos han sido guardados.',
            'success'
          );

          this.calcular(
            false
          );
        },

        error: error => {

          this.cargando =
            false;

          console.error(
            'ERROR GUARDAR BONOS:',
            error
          );

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error
            ),
            'error'
          );
        }

      });
  }


  // ==========================================================
  // IMPRIMIR REPORTE PDF
  // ==========================================================

  imprimir(): void {

    if (
      this.rowData.length === 0
    ) {

      this.mostrarMensaje(
        'No existen datos para imprimir.',
        'error'
      );

      return;
    }

    if (
      !this.generado
    ) {

      this.mostrarMensaje(
        'Debe grabar la información antes de generar el reporte.',
        'info'
      );

      return;
    }

    if (
      !this.validarEmpresa()
    ) {

      return;
    }

    const fechaPeriodo =
      String(
        this.form
          .get('fechaPeriodo')
          ?.value ??
        ''
      );

    if (!fechaPeriodo) {

      this.mostrarMensaje(
        'Seleccione el período.',
        'error'
      );

      return;
    }

    const request:
      ConsultarBonosRequest = {

        idEmpresa:
          this.idEmpresa,

        fechaPeriodo:
          fechaPeriodo,

        tipo:
          this.tipoBono,

        region:
          this.regionBono,

        idLocal:
          null,

        idEmpleado:
          null
      };

    /*
     * Abrimos la ventana inmediatamente por el clic del usuario.
     * Esto evita que Chrome bloquee la nueva pestaña cuando la
     * respuesta HTTP llegue de forma asíncrona.
     */
    const ventanaReporte =
      window.open(
        '',
        '_blank'
      );

    if (
      !ventanaReporte
    ) {

      this.mostrarMensaje(
        'El navegador bloqueó la ventana del reporte. Habilite las ventanas emergentes.',
        'info'
      );

      return;
    }

    ventanaReporte.document.write(
      '<html><body style="font-family:Arial;padding:20px;">Generando reporte...</body></html>'
    );

    this.cargando =
      true;

    this.bonosService
      .reporte(request)
      .subscribe({

        next: blob => {

          this.cargando =
            false;

          if (
            !blob ||
            blob.size === 0
          ) {

            ventanaReporte.close();

            this.mostrarMensaje(
              'El reporte PDF está vacío.',
              'error'
            );

            return;
          }

          const pdfBlob =
            new Blob(
              [blob],
              {
                type:
                  'application/pdf'
              }
            );

          const url =
            window.URL
              .createObjectURL(
                pdfBlob
              );

          /*
           * IMPORTANTE:
           * NO usamos window.print().
           * La pestaña navega al PDF generado por QuestPDF.
           */
          ventanaReporte.location.href =
            url;

          setTimeout(
            () => {

              window.URL
                .revokeObjectURL(
                  url
                );

            },
            120000
          );
        },

        error: error => {

          this.cargando =
            false;

          ventanaReporte.close();

          console.error(
            'ERROR REPORTE BONOS:',
            error
          );

          this.mostrarMensaje(
            'No fue posible generar el reporte de bonos.',
            'error'
          );
        }

      });
  }


  // ==========================================================
  // EXPORTAR EXCEL / CSV
  // ==========================================================

  exportarExcel(): void {

    if (
      !this.gridApi ||
      this.rowData.length === 0
    ) {

      this.mostrarMensaje(
        'No existen datos para exportar.',
        'error'
      );

      return;
    }

    this.gridApi
      .exportDataAsCsv({

        fileName:
          `bonos_${this.tipoBono}_${this.form.get('fechaPeriodo')?.value}.csv`,

        columnSeparator:
          ';'

      });
  }


  // ==========================================================
  // LIMPIAR
  // ==========================================================

  limpiar(): void {

    this.rowData = [];

    this.generado =
      false;

    this.fechaDesde =
      null;

    this.fechaHasta =
      null;

    this.mensaje =
      '';
  }


  // ==========================================================
  // NUEVO
  // ==========================================================

  nuevo(): void {

    this.limpiar();

    this.form
      .patchValue(
        {

          fechaPeriodo:
            this.obtenerUltimoDiaMes(),

          tipo:
            'BD',

          region:
            'S'

        },
        {

          emitEvent:
            false

        }
      );

    this.crearColumnas();

    /*
     * NO se llama a calcular().
     * El usuario debe presionar CALCULAR.
     */
  }


  // ==========================================================
  // RESPUESTA BACKEND
  // ==========================================================

  private cargarRespuesta(
    data: BonoEmpleadoResponse
  ): void {

    this.generado =
      data?.generado === true;

    this.fechaDesde =
      data?.fechaDesde ??
      null;

    this.fechaHasta =
      data?.fechaHasta ??
      null;

    this.rowData =
      (
        data?.detalles ||
        []
      )
        .map(item => {

          const valor =
            this.redondear(
              this.convertirNumero(
                item.valor
              )
            );

          const descuento =
            this.redondear(
              this.convertirNumero(
                item.descuento
              )
            );

          return {

            ...item,

            valor:
              valor,

            descuento:
              descuento,

            liquidoRecibir:
              this.redondear(
                valor -
                descuento
              )

          };
        });

    setTimeout(
      () => {

        this.gridApi
          ?.sizeColumnsToFit();

      },
      100
    );
  }


  // ==========================================================
  // GETTERS
  // ==========================================================

  get tipoBono():
    TipoBono {

    const valor =
      String(
        this.form
          ?.get('tipo')
          ?.value ??
        'BD'
      );

    if (valor === 'BH') {
      return 'BH';
    }

    if (valor === 'BE') {
      return 'BE';
    }

    return 'BD';
  }


  get regionBono():
    RegionBono {

    const valor =
      String(
        this.form
          ?.get('region')
          ?.value ??
        'S'
      );

    if (valor === 'C') {
      return 'C';
    }

    return 'S';
  }


  get nombreTipoBono():
    string {

    switch (
      this.tipoBono
    ) {

      case 'BH':
        return 'Bono Hijos';

      case 'BE':
        return 'Bono Estudiantil';

      default:
        return 'Bono Empleado';
    }
  }


  get totalValor():
    number {

    return this.redondear(
      this.rowData
        .reduce(
          (
            total,
            item
          ) =>
            total +
            this.convertirNumero(
              item.valor
            ),
          0
        )
    );
  }


  get totalDescuento():
    number {

    return this.redondear(
      this.rowData
        .reduce(
          (
            total,
            item
          ) =>
            total +
            this.convertirNumero(
              item.descuento
            ),
          0
        )
    );
  }


  get totalLiquido():
    number {

    return this.redondear(
      this.rowData
        .reduce(
          (
            total,
            item
          ) =>
            total +
            this.convertirNumero(
              item.liquidoRecibir
            ),
          0
        )
    );
  }


  // ==========================================================
  // FORMATO
  // ==========================================================

  formatearFecha(
    valor:
      string |
      null |
      undefined
  ): string {

    if (!valor) {
      return '';
    }

    const fecha =
      String(valor)
        .substring(
          0,
          10
        )
        .split(
          '-'
        );

    if (
      fecha.length !== 3
    ) {

      return String(
        valor
      );
    }

    return (
      fecha[2] +
      '/' +
      fecha[1] +
      '/' +
      fecha[0]
    );
  }


  formatearNumero(
    valor: any
  ): string {

    const numero =
      this.convertirNumero(
        valor
      );

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
  // UTILIDADES
  // ==========================================================

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

    if (
      typeof valor ===
      'number'
    ) {

      return Number.isFinite(
        valor
      )
        ? valor
        : 0;
    }

    const limpio =
      String(
        valor
      )
        .trim()
        .replace(
          /,/g,
          ''
        );

    const numero =
      Number(
        limpio
      );

    return Number.isFinite(
      numero
    )
      ? numero
      : 0;
  }


  private redondear(
    valor: number
  ): number {

    return (
      Math.round(
        (
          valor +
          Number.EPSILON
        ) *
        100
      ) /
      100
    );
  }


  private validarEmpresa():
    boolean {

    if (
      !this.idEmpresa ||
      this.idEmpresa <= 0
    ) {

      this.mostrarMensaje(
        'El usuario no tiene una empresa asignada.',
        'error'
      );

      return false;
    }

    return true;
  }


  private limpiarResultados():
    void {

    this.rowData = [];

    this.generado =
      false;

    this.fechaDesde =
      null;

    this.fechaHasta =
      null;

    this.mensaje =
      '';
  }


  private obtenerUltimoDiaMes():
    string {

    const hoy =
      new Date();

    const ultimoDia =
      new Date(
        hoy.getFullYear(),
        hoy.getMonth() + 1,
        0
      );

    const year =
      ultimoDia
        .getFullYear();

    const month =
      String(
        ultimoDia.getMonth() +
        1
      )
        .padStart(
          2,
          '0'
        );

    const day =
      String(
        ultimoDia.getDate()
      )
        .padStart(
          2,
          '0'
        );

    return (
      `${year}-${month}-${day}`
    );
  }


  private mostrarMensaje(
    mensaje: string,
    tipo:
      'success' |
      'error' |
      'info'
  ): void {

    this.mensaje =
      mensaje;

    this.tipoMensaje =
      tipo;
  }


  private obtenerMensajeError(
    error: any
  ): string {

    return (
      error
        ?.error
        ?.message ||

      error
        ?.error
        ?.Message ||

      error
        ?.message ||

      'Error al comunicarse con el servidor.'
    );
  }
  // ==========================================================
// BANCO
// ==========================================================

abrirModalBanco(): void {

  // --------------------------------------------------------
  // Debe existir información
  // --------------------------------------------------------

  if (
    !this.rowData.length
  ) {

    this.mostrarMensaje(
      'No existen registros para generar el proceso bancario.',
      'error'
    );

    return;
  }


  // --------------------------------------------------------
  // Debe estar grabado
  // --------------------------------------------------------

  if (
    !this.generado
  ) {

    this.mostrarMensaje(
      'Primero debe grabar la información del bono.',
      'info'
    );

    return;
  }


  // --------------------------------------------------------
  // Período
  // --------------------------------------------------------

  const fechaPeriodo =
    this.formatearFechaYYYYMMDD(
      this.form
        .get('fechaPeriodo')
        ?.value
    );


  if (
    !fechaPeriodo
  ) {

    this.mostrarMensaje(
      'Debe seleccionar el período.',
      'error'
    );

    return;
  }


  // --------------------------------------------------------
  // Modal
  // --------------------------------------------------------

  const dialogRef =
    this.dialog.open<
      DialogBancoNominaComponent,
      any,
      DialogBancoNominaResult | null
    >(
      DialogBancoNominaComponent,
      {

        width:
          '470px',

        disableClose:
          true,

        data:
          {

            fechaPeriodo:
              fechaPeriodo,

            idUsuario:
              this.idUsuario ?? 1,

            origen:
              'BONO'

          }

      }
    );


  // --------------------------------------------------------
  // GENERAR ARCHIVO
  // --------------------------------------------------------

  dialogRef
    .componentInstance
    .archivoSolicitado
    .subscribe(
      (
        result:
          DialogBancoNominaResult
      ) => {

        this.generarArchivoBancoDesdeModal(
          result
        );

      }
    );


  // --------------------------------------------------------
  // REPORTE FORMA DE PAGO
  // --------------------------------------------------------

  dialogRef
    .afterClosed()
    .subscribe(
      result => {

        if (
          result?.accion ===
          'REPORTE'
        ) {

          this.imprimirReporteFormaPagoDesdeModal(
            result
          );

        }

      }
    );
}
private construirRequestBanco(
  result:
    DialogBancoNominaResult
): BancoBonosRequest | null {

  const fechaPeriodo =
    this.formatearFechaYYYYMMDD(
      this.form
        .get('fechaPeriodo')
        ?.value
    );


  const codBanco =
    Number(
      result.codBanco
    );


  if (
    !this.idEmpresa ||
    !fechaPeriodo ||
    !codBanco
  ) {

    this.mostrarMensaje(
      'Faltan datos obligatorios para generar el proceso bancario.',
      'error'
    );

    return null;
  }


  return {

    idEmpresa:
      this.idEmpresa,

    fechaPeriodo:
      fechaPeriodo,

    tipo:
      this.tipoBono,

    region:
      this.regionBono,

    codBanco:
      codBanco,

    descripcionPago:
      result.descripcionPago ??
      this.obtenerDescripcionBanco(),

    idUsuario:
      Number(
        result.idUsuario ||
        this.idUsuario ||
        1
      )

  };
}
private obtenerDescripcionBanco():
  string {

  switch (
    this.tipoBono
  ) {

    case 'BH':

      return 'BONO HIJOS';


    case 'BE':

      return 'BONO ESTUDIANTIL';


    default:

      return 'BONO EMPLEADO';

  }
}
private generarArchivoBancoDesdeModal(
  result:
    DialogBancoNominaResult
): void {

  const request =
    this.construirRequestBanco(
      result
    );


  if (
    !request
  ) {

    return;
  }


  this.procesandoBanco =
    true;


  this.bonosService
    .generarArchivoBanco(
      request
    )
    .subscribe({

      next: response => {

        this.procesandoBanco =
          false;


        const esExito =
          (
            response.type ??
            ''
          )
            .toString()
            .toUpperCase() ===
          'SUCCESS';


        if (
          !esExito ||
          !response.data?.procesado
        ) {

          this.mostrarMensaje(
            response.message ??
            response.data?.mensaje ??
            'No se pudo generar el archivo bancario.',
            'error'
          );

          return;
        }


        if (
          !response.data.contenidoBase64 ||
          !response.data.nombreArchivo
        ) {

          this.mostrarMensaje(
            'El backend no devolvió el contenido del archivo bancario.',
            'error'
          );

          return;
        }


        this.descargarArchivoBancoBase64(

          response.data
            .contenidoBase64,

          response.data
            .nombreArchivo,

          response.data
            .contentType ||
          'text/plain'

        );


        this.mostrarMensaje(
          response.data.mensaje ??
          'Archivo bancario generado correctamente.',
          'success'
        );
      },


      error: error => {

        this.procesandoBanco =
          false;


        console.error(
          'ERROR BANCO BONOS:',
          error
        );


        this.mostrarMensaje(
          error?.error?.message ??
          error?.error?.title ??
          'Error al generar el archivo bancario.',
          'error'
        );
      }

    });
}
private imprimirReporteFormaPagoDesdeModal(
  result:
    DialogBancoNominaResult
): void {

  const request =
    this.construirRequestBanco(
      result
    );


  if (
    !request
  ) {

    return;
  }


  this.procesandoBanco =
    true;


  this.bonosService
    .imprimirReporteFormaPago(
      request
    )
    .subscribe({

      next: blob => {

        this.procesandoBanco =
          false;


        if (
          !blob ||
          blob.size === 0
        ) {

          this.mostrarMensaje(
            'El reporte se generó vacío.',
            'error'
          );

          return;
        }


        const url =
          window.URL
            .createObjectURL(
              blob
            );


        const ventana =
          window.open(
            url,
            '_blank'
          );


        if (
          !ventana
        ) {

          const link =
            document.createElement(
              'a'
            );


          link.href =
            url;


          link.download =
            `Reporte_${this.nombreArchivoBono()}_${request.fechaPeriodo}.pdf`;


          document.body
            .appendChild(
              link
            );


          link.click();


          document.body
            .removeChild(
              link
            );
        }


        setTimeout(
          () => {

            window.URL
              .revokeObjectURL(
                url
              );

          },
          30000
        );
      },


      error: error => {

        this.procesandoBanco =
          false;


        console.error(
          'ERROR REPORTE BANCO BONOS:',
          error
        );


        this.mostrarMensaje(
          error?.error?.message ??
          error?.error?.title ??
          'Error al generar el reporte de forma de pago.',
          'error'
        );
      }

    });
}
// ==========================================================
// NOMBRE DE ARCHIVO SEGÚN TIPO DE BONO
// ==========================================================

private nombreArchivoBono(): string {

  switch (
    this.tipoBono
  ) {

    case 'BH':

      return 'Bono_Hijos';

    case 'BE':

      return 'Bono_Estudiantil';

    case 'BD':

    default:

      return 'Bono_Empleado';
  }
}


private descargarArchivoBancoBase64(
  contenidoBase64: string,
  nombreArchivo: string,
  contentType:
    string = 'text/plain'
): void {

  const byteCharacters =
    atob(
      contenidoBase64
    );


  const byteNumbers =
    new Array<number>(
      byteCharacters.length
    );


  for (
    let i = 0;
    i <
    byteCharacters.length;
    i++
  ) {

    byteNumbers[i] =
      byteCharacters
        .charCodeAt(
          i
        );

  }


  const blob =
    new Blob(
      [
        new Uint8Array(
          byteNumbers
        )
      ],
      {
        type:
          contentType
      }
    );


  const url =
    window.URL
      .createObjectURL(
        blob
      );


  const link =
    document.createElement(
      'a'
    );


  link.href =
    url;


  link.download =
    nombreArchivo;


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
}
private formatearFechaYYYYMMDD(
  value: any
): string {

  if (
    !value
  ) {

    return '';

  }


  if (
    typeof value?.format ===
    'function'
  ) {

    return value.format(
      'YYYY-MM-DD'
    );

  }


  if (
    typeof value?.toDate ===
    'function'
  ) {

    value =
      value.toDate();

  }


  if (
    typeof value ===
    'string'
  ) {

    if (
      /^\d{4}-\d{2}-\d{2}/
        .test(
          value
        )
    ) {

      return value.substring(
        0,
        10
      );

    }


    const partes =
      value.split(
        '/'
      );


    if (
      partes.length === 3
    ) {

      return (
        `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
      );

    }


    return '';

  }


  const fecha =
    value as Date;


  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {

    return '';

  }


  const anio =
    fecha.getFullYear();


  const mes =
    String(
      fecha.getMonth() +
      1
    )
      .padStart(
        2,
        '0'
      );


  const dia =
    String(
      fecha.getDate()
    )
      .padStart(
        2,
        '0'
      );


  return (
    `${anio}-${mes}-${dia}`
  );
}
}
