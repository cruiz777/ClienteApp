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
  HttpErrorResponse
} from '@angular/common/http';

import {
  finalize
} from 'rxjs/operators';

import {
  MatSnackBar
} from '@angular/material/snack-bar';

import {
  MatDatepicker
} from '@angular/material/datepicker';

import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';

import {
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';

import {
  ReporteNominaService,
  ReporteProvisionesRequest,
  ReporteProvisionesResponse,
  ReporteProvisionRow,
  ReporteProvisionesTotales
} from 'src/app/services/rol/reporte-nomina.service';


/* ============================================================
   FORMATO DE FECHA

   Visual:
   30/09/2026

   API:
   2026-09-30
============================================================ */

export const REPORTE_DATE_FORMATS = {

  parse: {

    dateInput: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }

  },

  display: {

    dateInput: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    },

    monthYearLabel: {
      month: 'long',
      year: 'numeric'
    },

    dateA11yLabel: {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    },

    monthYearA11yLabel: {
      month: 'long',
      year: 'numeric'
    }

  }

};


@Component({

  selector:
    'app-reporte-provisiones',

  templateUrl:
    './reporte-provisiones.component.html',

  styleUrls: [
    './reporte-provisiones.component.css'
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
        MAT_DATE_FORMATS,

      useValue:
        REPORTE_DATE_FORMATS
    }

  ]

})
export class ReporteProvisionesComponent
  implements OnInit {

  // ============================================================
  // FORMULARIO
  // ============================================================

  form!: FormGroup;


  // ============================================================
  // AG GRID
  // ============================================================

  private gridApi:
    GridApi | null = null;


  rowData:
    ReporteProvisionRow[] = [];


  pinnedBottomRowData:
    any[] = [];


  // ============================================================
  // ESTADOS
  // ============================================================

  cargando =
    false;


  consultado =
    false;


  // ============================================================
  // CONTADORES
  // ============================================================

  cantidadGenerales =
    0;


  cantidadPasantes =
    0;


  // ============================================================
  // TOTALES
  // ============================================================

  totalGenerales:
    ReporteProvisionesTotales =
      this.crearTotalesVacios();


  totalPasantesBecarios:
    ReporteProvisionesTotales =
      this.crearTotalesVacios();


  // ============================================================
  // CONFIGURACIÓN AG GRID
  // ============================================================

  defaultColDef:
    ColDef = {

      sortable:
        true,

      filter:
        true,

      resizable:
        true,

      floatingFilter:
        false,

      minWidth:
        90

    };


  // ============================================================
  // COLUMNAS AG GRID
  // ============================================================

  columnDefs:
    ColDef[] = [

      {
        headerName:
          'Grupo',

        field:
          'grupo',

        width:
          185,

        pinned:
          'left',

        filter:
          'agTextColumnFilter'
      },


      {
        headerName:
          'ID',

        field:
          'idEmpleado',

        width:
          80,

        filter:
          'agNumberColumnFilter'
      },


      {
        headerName:
          'Cédula',

        field:
          'cedula',

        width:
          125,

        pinned:
          'left',

        filter:
          'agTextColumnFilter'
      },


      {
        headerName:
          'Nombres',

        field:
          'nombres',

        width:
          270,

        pinned:
          'left',

        filter:
          'agTextColumnFilter'
      },


      {
        headerName:
          'Área',

        field:
          'area',

        width:
          160,

        filter:
          'agTextColumnFilter'
      },


      {
        headerName:
          'Días',

        field:
          'dias',

        width:
          85,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            )
      },


      {
        headerName:
          'Sueldo',

        field:
          'sueldo',

        width:
          115,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearDinero(
              params.value
            )
      },


      {
        headerName:
          'Fecha Ingreso 1',

        field:
          'fechaIngreso1',

        width:
          140,

        filter:
          'agTextColumnFilter',

        valueFormatter:
          params =>
            this.formatearFecha(
              params.value
            )
      },


      {
        headerName:
          'Fecha Salida 1',

        field:
          'fechaSalida1',

        width:
          140,

        filter:
          'agTextColumnFilter',

        valueFormatter:
          params =>
            this.formatearFecha(
              params.value
            )
      },


      {
        headerName:
          'Fecha Ingreso 2',

        field:
          'fechaIngreso2',

        width:
          140,

        filter:
          'agTextColumnFilter',

        valueFormatter:
          params =>
            this.formatearFecha(
              params.value
            )
      },


      {
        headerName:
          'Fecha Salida 2',

        field:
          'fechaSalida2',

        width:
          140,

        filter:
          'agTextColumnFilter',

        valueFormatter:
          params =>
            this.formatearFecha(
              params.value
            )
      },


      {
        headerName:
          'Fecha Ingreso 3',

        field:
          'fechaIngreso3',

        width:
          140,

        filter:
          'agTextColumnFilter',

        valueFormatter:
          params =>
            this.formatearFecha(
              params.value
            )
      },


      {
        headerName:
          'Fecha Salida 3',

        field:
          'fechaSalida3',

        width:
          140,

        filter:
          'agTextColumnFilter',

        valueFormatter:
          params =>
            this.formatearFecha(
              params.value
            )
      },


      {
        headerName:
          'Días Fondos',

        field:
          'diasFondos',

        width:
          110,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            )
      },


      {
        headerName:
          'Aporte',

        field:
          'aporte',

        width:
          115,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearDinero(
              params.value
            )
      },


      {
        headerName:
          'D14',

        field:
          'decimoCuarto',

        width:
          105,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearDinero(
              params.value
            )
      },


      {
        headerName:
          'D13',

        field:
          'decimoTercero',

        width:
          105,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearDinero(
              params.value
            )
      },


      {
        headerName:
          'Fondos Reserva',

        field:
          'fondosReserva',

        width:
          135,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearDinero(
              params.value
            )
      },


      {
        headerName:
          'IECE',

        field:
          'iece',

        width:
          100,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearDinero(
              params.value
            )
      },


      {
        headerName:
          'SECAP',

        field:
          'secap',

        width:
          100,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearDinero(
              params.value
            )
      },


      {
        headerName:
          'Días Vac.',

        field:
          'diasVacaciones',

        width:
          110,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearNumero(
              params.value
            )
      },


      {
        headerName:
          'Vacaciones',

        field:
          'vacaciones',

        width:
          120,

        filter:
          'agNumberColumnFilter',

        type:
          'numericColumn',

        valueFormatter:
          params =>
            this.formatearDinero(
              params.value
            )
      }

    ];


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(

    private readonly fb:
      FormBuilder,

    private readonly reporteNominaService:
      ReporteNominaService,

    private readonly snackBar:
      MatSnackBar

  ) {}


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.crearFormulario();

  }


  // ============================================================
  // FORMULARIO
  // ============================================================

  private crearFormulario(): void {

    this.form =
      this.fb.group({

        periodoInicial: [
          null,
          Validators.required
        ]

      });

  }


  // ============================================================
  // GRID READY
  // ============================================================

  onGridReady(
    event:
      GridReadyEvent
  ): void {

    this.gridApi =
      event.api;

  }


  // ============================================================
  // SELECCIONAR MES
  //
  // Selecciona año + mes.
  //
  // Se coloca automáticamente el último día.
  //
  // Septiembre 2026
  // ->
  // 30/09/2026
  // ============================================================

  seleccionarMes(
    fecha:
      Date,

    datepicker:
      MatDatepicker<Date>
  ): void {

    if (
      !fecha
    ) {

      return;

    }


    const ultimoDiaMes =
      new Date(

        fecha.getFullYear(),

        fecha.getMonth() + 1,

        0

      );


    this.form.patchValue({

      periodoInicial:
        ultimoDiaMes

    });


    this.form
      .get(
        'periodoInicial'
      )
      ?.markAsDirty();


    this.form
      .get(
        'periodoInicial'
      )
      ?.markAsTouched();


    datepicker.close();

  }


  // ============================================================
  // CONSULTAR
  // ============================================================

  aceptar(): void {

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


      this.mostrarAdvertencia(
        'Debe seleccionar el período.'
      );


      return;

    }


    // ==========================================================
    // FECHA PARA API
    //
    // Visual:
    // 30/09/2026
    //
    // API:
    // 2026-09-30
    // ==========================================================

    const fechaPeriodo =
      this.convertirFechaApi(

        this.form
          .get(
            'periodoInicial'
          )
          ?.value

      );


    if (
      fechaPeriodo === ''
    ) {

      this.mostrarAdvertencia(
        'Debe seleccionar el período.'
      );


      return;

    }


    // ==========================================================
    // REQUEST
    // ==========================================================

    const request:
      ReporteProvisionesRequest = {

      fechaPeriodo:
        fechaPeriodo

    };


    console.log(
      'Reporte provisiones:',
      request
    );


    // ==========================================================
    // LIMPIAR
    // ==========================================================

    this.limpiarResultados();


    this.cargando =
      true;


    // ==========================================================
    // CONSULTAR API
    // ==========================================================

    this.reporteNominaService
      .consultarProvisiones(
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

            this.consultado =
              true;


            const data:
              ReporteProvisionesResponse | null =

                response?.data
                ??
                null;


            if (
              !data
            ) {

              this.mostrarAdvertencia(
                'El servicio no devolvió información.'
              );


              return;

            }


            // ===================================================
            // CONTADORES
            // ===================================================

            this.cantidadGenerales =
              data
                .empleadosGenerales
                ?.length
              ??
              0;


            this.cantidadPasantes =
              data
                .pasantesBecarios
                ?.length
              ??
              0;


            // ===================================================
            // TOTALES
            // ===================================================

            this.totalGenerales =
              data.totalGenerales
              ??
              this.crearTotalesVacios();


            this.totalPasantesBecarios =
              data.totalPasantesBecarios
              ??
              this.crearTotalesVacios();


            // ===================================================
            // EMPLEADOS GENERALES
            // ===================================================

            const generales:
              ReporteProvisionRow[] =

                (
                  data.empleadosGenerales
                  ??
                  []
                )

                .map(
                  item => ({

                    ...item,

                    grupo:
                      'EMPLEADOS GENERALES'

                  })
                );


            // ===================================================
            // PASANTES / BECARIOS
            // ===================================================

            const pasantes:
              ReporteProvisionRow[] =

                (
                  data.pasantesBecarios
                  ??
                  []
                )

                .map(
                  item => ({

                    ...item,

                    grupo:
                      'PASANTES / BECARIOS'

                  })
                );


            // ===================================================
            // AG GRID
            // ===================================================

            this.rowData = [

              ...generales,

              ...pasantes

            ];


            // ===================================================
            // TOTALES
            // ===================================================

            this.crearFilasTotales();


            // ===================================================
            // SIN DATOS
            // ===================================================

            if (
              this.rowData.length === 0
            ) {

              this.mostrarAdvertencia(

                response?.message
                ??
                'No existen provisiones para el período seleccionado.'

              );


              return;

            }


            this.mostrarExito(

              `${this.rowData.length} registro(s) encontrados.`

            );

          },


        error:
          (
            error:
              HttpErrorResponse
          ) => {

            this.consultado =
              true;


            console.error(
              'Error consultando provisiones:',
              error
            );


            this.mostrarError(

              this.obtenerMensajeError(

                error,

                'No se pudo consultar el reporte de provisiones.'

              )

            );

          }

      });

  }


  // ============================================================
  // CONVERTIR FECHA PARA API
  //
  // Siempre obtiene el último día del mes.
  //
  // 30/09/2026
  // ->
  // 2026-09-30
  // ============================================================

  private convertirFechaApi(
    valor:
      Date | string | null | undefined
  ): string {

    if (
      !valor
    ) {

      return '';

    }


    let fecha:
      Date;


    if (
      valor instanceof Date
    ) {

      fecha =
        valor;

    }
    else {

      fecha =
        new Date(
          valor
        );

    }


    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {

      return '';

    }


    // ==========================================================
    // SIEMPRE ÚLTIMO DÍA DEL MES
    // ==========================================================

    const ultimoDia =
      new Date(

        fecha.getFullYear(),

        fecha.getMonth() + 1,

        0

      );


    const anio =
      ultimoDia
        .getFullYear();


    const mes =
      (
        ultimoDia
          .getMonth()
        +
        1
      )
        .toString()
        .padStart(
          2,
          '0'
        );


    const dia =
      ultimoDia
        .getDate()
        .toString()
        .padStart(
          2,
          '0'
        );


    return (
      `${anio}-${mes}-${dia}`
    );

  }


  // ============================================================
  // FILAS DE TOTALES
  // ============================================================

  private crearFilasTotales(): void {

    this.pinnedBottomRowData =
      [];


    // ==========================================================
    // GENERALES
    // ==========================================================

    if (
      this.cantidadGenerales > 0
    ) {

      this.pinnedBottomRowData.push({

        grupo:
          'TOTAL',

        idEmpleado:
          null,

        cedula:
          '',

        nombres:
          'TOTAL EMPLEADOS GENERALES',

        area:
          '',

        dias:
          null,

        sueldo:
          this.totalGenerales.sueldo,

        fechaIngreso1:
          null,

        fechaSalida1:
          null,

        fechaIngreso2:
          null,

        fechaSalida2:
          null,

        fechaIngreso3:
          null,

        fechaSalida3:
          null,

        diasFondos:
          null,

        aporte:
          this.totalGenerales.aporte,

        decimoCuarto:
          this.totalGenerales.decimoCuarto,

        decimoTercero:
          this.totalGenerales.decimoTercero,

        fondosReserva:
          this.totalGenerales.fondosReserva,

        iece:
          this.totalGenerales.iece,

        secap:
          this.totalGenerales.secap,

        diasVacaciones:
          null,

        vacaciones:
          this.totalGenerales.vacaciones

      });

    }


    // ==========================================================
    // PASANTES
    // ==========================================================

    if (
      this.cantidadPasantes > 0
    ) {

      this.pinnedBottomRowData.push({

        grupo:
          'TOTAL',

        idEmpleado:
          null,

        cedula:
          '',

        nombres:
          'TOTAL PASANTES / BECARIOS',

        area:
          '',

        dias:
          null,

        sueldo:
          this.totalPasantesBecarios.sueldo,

        fechaIngreso1:
          null,

        fechaSalida1:
          null,

        fechaIngreso2:
          null,

        fechaSalida2:
          null,

        fechaIngreso3:
          null,

        fechaSalida3:
          null,

        diasFondos:
          null,

        aporte:
          this.totalPasantesBecarios.aporte,

        decimoCuarto:
          this.totalPasantesBecarios.decimoCuarto,

        decimoTercero:
          this.totalPasantesBecarios.decimoTercero,

        fondosReserva:
          this.totalPasantesBecarios.fondosReserva,

        iece:
          this.totalPasantesBecarios.iece,

        secap:
          this.totalPasantesBecarios.secap,

        diasVacaciones:
          null,

        vacaciones:
          this.totalPasantesBecarios.vacaciones

      });

    }

  }


  // ============================================================
  // TOTAL REGISTROS
  // ============================================================

  get totalRegistros(): number {

    return (

      this.cantidadGenerales
      +
      this.cantidadPasantes

    );

  }


  // ============================================================
  // HAY DATOS
  // ============================================================

  get hayResultados(): boolean {

    return (
      this.rowData.length > 0
    );

  }


  // ============================================================
  // EXPORTAR EXCEL
  // ============================================================

  exportarExcel(): void {

    if (
      !this.hayResultados
    ) {

      this.mostrarAdvertencia(
        'No existen datos para exportar.'
      );


      return;

    }


    // ==========================================================
    // FILAS VISIBLES DEL AG GRID
    // ==========================================================

    const filas:
      ReporteProvisionRow[] = [];


    if (
      this.gridApi
    ) {

      this.gridApi
        .forEachNodeAfterFilterAndSort(
          node => {

            if (
              node.data
            ) {

              filas.push(
                node.data
              );

            }

          }
        );

    }
    else {

      filas.push(
        ...this.rowData
      );

    }


    if (
      filas.length === 0
    ) {

      this.mostrarAdvertencia(
        'No existen filas para exportar.'
      );


      return;

    }


    const xml =
      this.generarExcelXml(
        filas
      );


    const blob =
      new Blob(
        [
          '\uFEFF',
          xml
        ],
        {
          type:
            'application/vnd.ms-excel;charset=utf-8;'
        }
      );


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


    const periodo =
      this.convertirFechaApi(

        this.form
          .get(
            'periodoInicial'
          )
          ?.value

      )
      ||
      'periodo';


    link.href =
      url;


    link.download =
      `Reporte_Provisiones_${periodo}.xls`;


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


    this.mostrarExito(
      'Reporte exportado correctamente.'
    );

  }


  // ============================================================
  // GENERAR EXCEL
  // ============================================================

  private generarExcelXml(
    filas:
      ReporteProvisionRow[]
  ): string {

    const encabezados:
      string[] = [

        'Grupo',

        'ID Empleado',

        'Cédula',

        'Nombres',

        'Área',

        'Días',

        'Sueldo',

        'Fecha Ingreso 1',

        'Fecha Salida 1',

        'Fecha Ingreso 2',

        'Fecha Salida 2',

        'Fecha Ingreso 3',

        'Fecha Salida 3',

        'Días Fondos',

        'Aporte',

        'D14',

        'D13',

        'Fondos Reserva',

        'IECE',

        'SECAP',

        'Días Vacaciones',

        'Vacaciones'

      ];


    let filasXml =
      '';


    // ==========================================================
    // CABECERA
    // ==========================================================

    filasXml +=
      '<Row>';


    encabezados.forEach(
      encabezado => {

        filasXml +=
          this.crearCeldaTexto(
            encabezado,
            'Header'
          );

      }
    );


    filasXml +=
      '</Row>';


    // ==========================================================
    // DATOS
    // ==========================================================

    filas.forEach(
      item => {

        filasXml +=
          '<Row>';


        filasXml +=
          this.crearCeldaTexto(
            item.grupo ?? ''
          );


        filasXml +=
          this.crearCeldaNumero(
            item.idEmpleado
          );


        filasXml +=
          this.crearCeldaTexto(
            item.cedula
          );


        filasXml +=
          this.crearCeldaTexto(
            item.nombres
          );


        filasXml +=
          this.crearCeldaTexto(
            item.area
          );


        filasXml +=
          this.crearCeldaNumero(
            item.dias
          );


        filasXml +=
          this.crearCeldaNumero(
            item.sueldo
          );


        filasXml +=
          this.crearCeldaTexto(
            this.formatearFecha(
              item.fechaIngreso1
            )
          );


        filasXml +=
          this.crearCeldaTexto(
            this.formatearFecha(
              item.fechaSalida1
            )
          );


        filasXml +=
          this.crearCeldaTexto(
            this.formatearFecha(
              item.fechaIngreso2
            )
          );


        filasXml +=
          this.crearCeldaTexto(
            this.formatearFecha(
              item.fechaSalida2
            )
          );


        filasXml +=
          this.crearCeldaTexto(
            this.formatearFecha(
              item.fechaIngreso3
            )
          );


        filasXml +=
          this.crearCeldaTexto(
            this.formatearFecha(
              item.fechaSalida3
            )
          );


        filasXml +=
          this.crearCeldaNumero(
            item.diasFondos
          );


        filasXml +=
          this.crearCeldaNumero(
            item.aporte
          );


        filasXml +=
          this.crearCeldaNumero(
            item.decimoCuarto
          );


        filasXml +=
          this.crearCeldaNumero(
            item.decimoTercero
          );


        filasXml +=
          this.crearCeldaNumero(
            item.fondosReserva
          );


        filasXml +=
          this.crearCeldaNumero(
            item.iece
          );


        filasXml +=
          this.crearCeldaNumero(
            item.secap
          );


        filasXml +=
          this.crearCeldaNumero(
            item.diasVacaciones
          );


        filasXml +=
          this.crearCeldaNumero(
            item.vacaciones
          );


        filasXml +=
          '</Row>';

      }
    );


    // ==========================================================
    // TOTALES
    // ==========================================================

    this.pinnedBottomRowData
      .forEach(
        total => {

          filasXml +=
            '<Row>';


          filasXml +=
            this.crearCeldaTexto(
              'TOTAL',
              'Total'
            );


          filasXml +=
            this.crearCeldaTexto(
              '',
              'Total'
            );


          filasXml +=
            this.crearCeldaTexto(
              '',
              'Total'
            );


          filasXml +=
            this.crearCeldaTexto(
              total.nombres ?? '',
              'Total'
            );


          filasXml +=
            this.crearCeldaTexto(
              '',
              'Total'
            );


          filasXml +=
            this.crearCeldaTexto(
              '',
              'Total'
            );


          filasXml +=
            this.crearCeldaNumero(
              total.sueldo,
              'Total'
            );


          for (
            let i = 0;
            i < 6;
            i++
          ) {

            filasXml +=
              this.crearCeldaTexto(
                '',
                'Total'
              );

          }


          filasXml +=
            this.crearCeldaTexto(
              '',
              'Total'
            );


          filasXml +=
            this.crearCeldaNumero(
              total.aporte,
              'Total'
            );


          filasXml +=
            this.crearCeldaNumero(
              total.decimoCuarto,
              'Total'
            );


          filasXml +=
            this.crearCeldaNumero(
              total.decimoTercero,
              'Total'
            );


          filasXml +=
            this.crearCeldaNumero(
              total.fondosReserva,
              'Total'
            );


          filasXml +=
            this.crearCeldaNumero(
              total.iece,
              'Total'
            );


          filasXml +=
            this.crearCeldaNumero(
              total.secap,
              'Total'
            );


          filasXml +=
            this.crearCeldaTexto(
              '',
              'Total'
            );


          filasXml +=
            this.crearCeldaNumero(
              total.vacaciones,
              'Total'
            );


          filasXml +=
            '</Row>';

        }
      );


    return `
<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>

<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">

  <Styles>

    <Style ss:ID="Default">
      <Alignment ss:Vertical="Center"/>
    </Style>

    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Alignment
        ss:Horizontal="Center"
        ss:Vertical="Center"/>
    </Style>

    <Style ss:ID="Total">
      <Font ss:Bold="1"/>
    </Style>

  </Styles>

  <Worksheet ss:Name="PROVISIONES">

    <Table>

      ${filasXml}

    </Table>

  </Worksheet>

</Workbook>
`;

  }


  // ============================================================
  // CELDA TEXTO
  // ============================================================

  private crearCeldaTexto(
    valor:
      unknown,

    estilo?:
      string
  ): string {

    const style =
      estilo
        ? ` ss:StyleID="${estilo}"`
        : '';


    return (

      `<Cell${style}>` +

      `<Data ss:Type="String">` +

      `${this.escaparXml(valor)}` +

      `</Data>` +

      `</Cell>`

    );

  }


  // ============================================================
  // CELDA NUMÉRICA
  // ============================================================

  private crearCeldaNumero(
    valor:
      unknown,

    estilo?:
      string
  ): string {

    const numero =
      Number(
        valor ?? 0
      );


    const numeroValido =
      Number.isFinite(
        numero
      )
        ? numero
        : 0;


    const style =
      estilo
        ? ` ss:StyleID="${estilo}"`
        : '';


    return (

      `<Cell${style}>` +

      `<Data ss:Type="Number">` +

      `${numeroValido}` +

      `</Data>` +

      `</Cell>`

    );

  }


  // ============================================================
  // ESCAPAR XML
  // ============================================================

  private escaparXml(
    valor:
      unknown
  ): string {

    return (
      valor ?? ''
    )
      .toString()

      .replace(
        /&/g,
        '&amp;'
      )

      .replace(
        /</g,
        '&lt;'
      )

      .replace(
        />/g,
        '&gt;'
      )

      .replace(
        /"/g,
        '&quot;'
      )

      .replace(
        /'/g,
        '&apos;'
      );

  }


  // ============================================================
  // LIMPIAR
  // ============================================================

  cancelar(): void {

    if (
      this.cargando
    ) {

      return;

    }


    this.form.reset({

      periodoInicial:
        null

    });


    this.consultado =
      false;


    this.limpiarResultados();

  }


  // ============================================================
  // LIMPIAR RESULTADOS
  // ============================================================

  private limpiarResultados(): void {

    this.rowData =
      [];


    this.pinnedBottomRowData =
      [];


    this.cantidadGenerales =
      0;


    this.cantidadPasantes =
      0;


    this.totalGenerales =
      this.crearTotalesVacios();


    this.totalPasantesBecarios =
      this.crearTotalesVacios();


    if (
      this.gridApi
    ) {

      this.gridApi
        .setFilterModel(
          null
        );

    }

  }


  // ============================================================
  // TOTALES VACÍOS
  // ============================================================

  private crearTotalesVacios():
    ReporteProvisionesTotales {

    return {

      sueldo:
        0,

      aporte:
        0,

      decimoCuarto:
        0,

      decimoTercero:
        0,

      fondosReserva:
        0,

      iece:
        0,

      secap:
        0,

      vacaciones:
        0

    };

  }


  // ============================================================
  // FORMATEAR FECHA DE LAS COLUMNAS
  //
  // 2026-09-30
  // ->
  // 30/09/2026
  // ============================================================

  formatearFecha(
    fecha:
      string | null | undefined
  ): string {

    if (
      !fecha
    ) {

      return '';

    }


    const valor =
      fecha
        .toString()
        .substring(
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

      return valor;

    }


    return (

      `${partes[2]}/` +

      `${partes[1]}/` +

      `${partes[0]}`

    );

  }


  // ============================================================
  // DINERO CON PUNTO DECIMAL
  //
  // 741
  // ->
  // 741.00
  //
  // 1118
  // ->
  // 1118.00
  // ============================================================

  private formatearDinero(
    valor:
      unknown
  ): string {

    if (
      valor === null
      ||
      valor === undefined
      ||
      valor === ''
    ) {

      return '';

    }


    const numero =
      Number(
        valor
      );


    if (
      !Number.isFinite(
        numero
      )
    ) {

      return '';

    }


    return numero
      .toFixed(
        2
      );

  }


  // ============================================================
  // NÚMEROS
  // ============================================================

  private formatearNumero(
    valor:
      unknown
  ): string {

    if (
      valor === null
      ||
      valor === undefined
      ||
      valor === ''
    ) {

      return '';

    }


    const numero =
      Number(
        valor
      );


    if (
      !Number.isFinite(
        numero
      )
    ) {

      return '';

    }


    if (
      Number.isInteger(
        numero
      )
    ) {

      return numero
        .toString();

    }


    return numero
      .toFixed(
        2
      );

  }


  // ============================================================
  // ERROR API
  // ============================================================

  private obtenerMensajeError(
    error:
      HttpErrorResponse,

    mensajeDefault:
      string
  ): string {

    if (
      typeof error.error ===
      'string'
      &&
      error.error.trim() !==
      ''
    ) {

      return error.error;

    }


    if (
      error.error
      &&
      typeof error.error ===
      'object'
    ) {

      if (
        error.error.message
      ) {

        return error.error.message;

      }


      if (
        error.error.mensaje
      ) {

        return error.error.mensaje;

      }

    }


    return mensajeDefault;

  }


  // ============================================================
  // ÉXITO
  // ============================================================

  private mostrarExito(
    mensaje:
      string
  ): void {

    this.snackBar.open(

      mensaje,

      'Cerrar',

      {

        duration:
          4000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        panelClass: [
          'snackbar-success'
        ]

      }

    );

  }


  // ============================================================
  // ADVERTENCIA
  // ============================================================

  private mostrarAdvertencia(
    mensaje:
      string
  ): void {

    this.snackBar.open(

      mensaje,

      'Cerrar',

      {

        duration:
          5000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        panelClass: [
          'snackbar-warning'
        ]

      }

    );

  }


  // ============================================================
  // ERROR
  // ============================================================

  private mostrarError(
    mensaje:
      string
  ): void {

    this.snackBar.open(

      mensaje,

      'Cerrar',

      {

        duration:
          7000,

        horizontalPosition:
          'end',

        verticalPosition:
          'top',

        panelClass: [
          'snackbar-error'
        ]

      }

    );

  }
  

}