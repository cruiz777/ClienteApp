import {
  Component,
  OnInit
} from '@angular/core';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  finalize
} from 'rxjs/operators';

import {
  ColDef,
  ColGroupDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';

import {
  ReporteNominaService,
  ReportePersonalOcupadoRequest,
  ReportePersonalOcupadoResponse,
  PersonalOcupadoRow
} from 'src/app/services/rol/reporte-nomina.service';


@Component({
  selector:
    'app-personal-ocupado',

  templateUrl:
    './personal-ocupado.component.html',

  styleUrls: [
    './personal-ocupado.component.css'
  ]
})
export class PersonalOcupadoComponent
  implements OnInit {

  // ============================================================
  // FILTROS
  // ============================================================

  mes:
    number = new Date().getMonth() + 1;


  anio:
    number = new Date().getFullYear();


  agrupadoPor:
    'contrato'
    |
    'edad'
    |
    'horas' = 'contrato';


  // ============================================================
  // CATÁLOGOS
  // ============================================================

  meses = [

    {
      id: 1,
      nombre: 'Enero'
    },

    {
      id: 2,
      nombre: 'Febrero'
    },

    {
      id: 3,
      nombre: 'Marzo'
    },

    {
      id: 4,
      nombre: 'Abril'
    },

    {
      id: 5,
      nombre: 'Mayo'
    },

    {
      id: 6,
      nombre: 'Junio'
    },

    {
      id: 7,
      nombre: 'Julio'
    },

    {
      id: 8,
      nombre: 'Agosto'
    },

    {
      id: 9,
      nombre: 'Septiembre'
    },

    {
      id: 10,
      nombre: 'Octubre'
    },

    {
      id: 11,
      nombre: 'Noviembre'
    },

    {
      id: 12,
      nombre: 'Diciembre'
    }

  ];


  anios:
    number[] = [];


  // ============================================================
  // AG GRID
  // ============================================================

  private gridApi:
    GridApi | null = null;


  rowData:
    PersonalOcupadoRow[] = [];


  pinnedBottomRowData:
    PersonalOcupadoRow[] = [];


  columnDefs:
    (
      ColDef
      |
      ColGroupDef
    )[] = [];


  defaultColDef:
    ColDef = {

      sortable:
        true,

      filter:
        true,

      resizable:
        true,

      minWidth:
        100,

      suppressMovable:
        false

    };


  // ============================================================
  // ESTADOS
  // ============================================================

  cargando:
    boolean = false;


  consultado:
    boolean = false;


  mensaje:
    string = '';


  respuesta:
    ReportePersonalOcupadoResponse | null =
      null;


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private readonly reporteNominaService:
      ReporteNominaService
  ) {}


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.cargarAnios();

    this.actualizarColumnas();

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
  // AÑOS
  // ============================================================

  private cargarAnios(): void {

    const actual =
      new Date()
        .getFullYear();


    this.anios =
      [];


    for (
      let i = actual;
      i >= actual - 30;
      i--
    ) {

      this.anios.push(
        i
      );

    }

  }


  // ============================================================
  // CAMBIO AGRUPACIÓN
  // ============================================================

  cambiarAgrupacion(): void {

    this.rowData =
      [];


    this.pinnedBottomRowData =
      [];


    this.respuesta =
      null;


    this.consultado =
      false;


    this.mensaje =
      '';


    this.actualizarColumnas();

  }


  // ============================================================
  // ACTUALIZAR COLUMNAS
  // ============================================================

  private actualizarColumnas(): void {

    switch (
      this.agrupadoPor
    ) {

      case 'edad':

        this.columnDefs =
          this.crearColumnasEdad();

        break;


      case 'horas':

        this.columnDefs =
          this.crearColumnasHoras();

        break;


      default:

        this.columnDefs =
          this.crearColumnasContrato();

        break;

    }

  }


  // ============================================================
  // COLUMNAS CONTRATO
  // ============================================================

  private crearColumnasContrato():
    (
      ColDef
      |
      ColGroupDef
    )[] {

    return [

      {
        headerName:
          'Grupo de ocupación',

        field:
          'grupo',

        pinned:
          'left',

        width:
          300,

        minWidth:
          250,

        filter:
          'agTextColumnFilter'
      },


      // ========================================================
      // SIN DISCAPACIDAD
      // ========================================================

      {
        headerName:
          'Sin discapacidad',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (1)',

            field:
              'sinDiscapacidadH',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (2)',

            field:
              'sinDiscapacidadM',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // CON DISCAPACIDAD
      // ========================================================

      {
        headerName:
          'Con discapacidad',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (3)',

            field:
              'conDiscapacidadH',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (4)',

            field:
              'conDiscapacidadM',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // PERMANENTE TIEMPO COMPLETO
      // ========================================================

      {
        headerName:
          'Permanente (Tiempo Completo)',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (5)',

            field:
              'permanenteCompletoH',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (6)',

            field:
              'permanenteCompletoM',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // PERMANENTE TIEMPO PARCIAL
      // ========================================================

      {
        headerName:
          'Permanente (Tiempo Parcial)',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (7)',

            field:
              'permanenteParcialH',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (8)',

            field:
              'permanenteParcialM',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // TEMPORAL
      // ========================================================

      {
        headerName:
          'Permanente (Temporal)',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (9)',

            field:
              'temporalH',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (10)',

            field:
              'temporalM',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // TOTAL
      // ========================================================

      {
        headerName:
          'Total',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (11)',

            field:
              'totalH',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (12)',

            field:
              'totalM',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Total (13)',

            field:
              'total',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      }

    ];

  }


  // ============================================================
  // COLUMNAS EDAD
  // ============================================================

  private crearColumnasEdad():
    (
      ColDef
      |
      ColGroupDef
    )[] {

    return [

      {
        headerName:
          'Grupo de ocupación',

        field:
          'grupo',

        pinned:
          'left',

        width:
          300,

        minWidth:
          250
      },


      // ========================================================
      // <= 11
      // ========================================================

      {
        headerName:
          'Menores de 11 años',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (1)',

            field:
              'menorIgual11H',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (2)',

            field:
              'menorIgual11M',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // 12 - 17
      // ========================================================

      {
        headerName:
          'Entre 12 a 17 años',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (3)',

            field:
              'de12A17H',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (4)',

            field:
              'de12A17M',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // 18 - 29
      // ========================================================

      {
        headerName:
          'Entre 18 a 29 años',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (5)',

            field:
              'de18A29H',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (6)',

            field:
              'de18A29M',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // 30 - 64
      // ========================================================

      {
        headerName:
          'Entre 30 a 64 años',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (7)',

            field:
              'de30A64H',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (8)',

            field:
              'de30A64M',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // > 64
      // ========================================================

      {
        headerName:
          'Mayores a 65 años',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (9)',

            field:
              'mayor64H',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (10)',

            field:
              'mayor64M',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      },


      // ========================================================
      // TOTAL
      // ========================================================

      {
        headerName:
          'Total',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (11)',

            field:
              'totalH',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Mujeres (12)',

            field:
              'totalM',

            width:
              120,

            type:
              'numericColumn'
          },

          {
            headerName:
              'Total (13)',

            field:
              'total',

            width:
              120,

            type:
              'numericColumn'
          }

        ]
      }

    ];

  }


  // ============================================================
  // COLUMNAS HORAS / SALARIO
  // ============================================================

  private crearColumnasHoras():
    (
      ColDef
      |
      ColGroupDef
    )[] {

    return [

      {
        headerName:
          'Grupo de ocupación',

        field:
          'grupo',

        pinned:
          'left',

        width:
          300,

        minWidth:
          250
      },


      // ========================================================
      // HORAS MES
      // ========================================================

      {
        headerName:
          'Total de horas trabajadas en el mes',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Horas normales (1)',

            field:
              'horasNormales',

            width:
              150,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          },

          {
            headerName:
              'Horas extras (2)',

            field:
              'horasExtras',

            width:
              150,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          },

          {
            headerName:
              'Total (3)',

            field:
              'totalHoras',

            width:
              140,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          }

        ]
      },


      // ========================================================
      // SUELDO MES
      // ========================================================

      {
        headerName:
          'Total de sueldo y salarios pagados en el mes',

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (4)',

            field:
              'sueldoMesH',

            width:
              140,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          },

          {
            headerName:
              'Mujeres (5)',

            field:
              'sueldoMesM',

            width:
              140,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          },

          {
            headerName:
              'Total (6)',

            field:
              'sueldoMesTotal',

            width:
              140,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          }

        ]
      },


      // ========================================================
      // SUELDO AÑO
      // ========================================================

      {
        headerName:
          `Total de sueldo y salarios pagados en el año ${this.anio}`,

        marryChildren:
          true,

        children: [

          {
            headerName:
              'Hombres (7)',

            field:
              'sueldoAnioH',

            width:
              140,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          },

          {
            headerName:
              'Mujeres (8)',

            field:
              'sueldoAnioM',

            width:
              140,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          },

          {
            headerName:
              'Total (9)',

            field:
              'sueldoAnioTotal',

            width:
              140,

            type:
              'numericColumn',

            valueFormatter:
              params =>
                this.formatearDecimal(
                  params.value
                )
          }

        ]
      }

    ];

  }


  // ============================================================
  // GENERAR
  // ============================================================

  generar(): void {

    if (
      this.cargando
    ) {

      return;

    }


    if (
      !this.mes
      ||
      this.mes < 1
      ||
      this.mes > 12
    ) {

      this.mensaje =
        'Debe seleccionar un mes válido.';


      return;

    }


    if (
      !this.anio
    ) {

      this.mensaje =
        'Debe seleccionar un año.';


      return;

    }


    // Actualiza cabecera del año antes de consultar.
    this.actualizarColumnas();


    const request:
      ReportePersonalOcupadoRequest = {

      mes:
        this.mes,

      anio:
        this.anio,

      agrupadoPor:
        this.agrupadoPor

    };


    this.rowData =
      [];


    this.pinnedBottomRowData =
      [];


    this.respuesta =
      null;


    this.consultado =
      false;


    this.mensaje =
      '';


    this.cargando =
      true;


    this.reporteNominaService
      .consultarPersonalOcupado(
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


            if (
              !response?.data
            ) {

              this.mensaje =
                response?.message
                ??
                'El servicio no devolvió información.';


              return;

            }


            this.respuesta =
              response.data;


            this.rowData =
              response.data.filas
              ??
              [];


            // ===================================================
            // FILA TOTAL FIJA
            // ===================================================

            if (
              response.data.totales
            ) {

              this.pinnedBottomRowData = [

                {
                  ...response.data.totales,

                  grupo:
                    'TOTAL'
                }

              ];

            }
            else {

              this.pinnedBottomRowData =
                [];

            }


            if (
              this.rowData.length === 0
            ) {

              this.mensaje =
                response.message
                ??
                'No existen registros para el período seleccionado.';

            }
            else {

              this.mensaje =
                response.message
                ??
                '';

            }

          },


        error:
          (
            error:
              HttpErrorResponse
          ) => {

            console.error(
              'Error Personal Ocupado:',
              error
            );


            this.consultado =
              true;


            this.rowData =
              [];


            this.pinnedBottomRowData =
              [];


            this.mensaje =
              this.obtenerMensajeError(
                error
              );

          }

      });

  }


  // ============================================================
  // HAY RESULTADOS
  // ============================================================

  get hayResultados(): boolean {

    return (
      this.rowData.length > 0
    );

  }


  // ============================================================
  // EXPORTAR
  //
  // AG Grid Community no genera XLSX nativo.
  // Conservamos exportación XLS compatible con Excel.
  // Exporta las filas visibles después de filtro/orden.
  // ============================================================

  exportar(): void {

    if (
      !this.hayResultados
    ) {

      this.mensaje =
        'No existen datos para exportar.';


      return;

    }


    const filas:
      PersonalOcupadoRow[] = [];


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

      return;

    }


    let encabezados:
      string[] = [];


    let campos:
      string[] = [];


    // ==========================================================
    // CONTRATO
    // ==========================================================

    if (
      this.agrupadoPor ===
      'contrato'
    ) {

      encabezados = [

        'Grupo de ocupación',

        'Sin discapacidad - Hombres',

        'Sin discapacidad - Mujeres',

        'Con discapacidad - Hombres',

        'Con discapacidad - Mujeres',

        'Permanente Tiempo Completo - Hombres',

        'Permanente Tiempo Completo - Mujeres',

        'Permanente Tiempo Parcial - Hombres',

        'Permanente Tiempo Parcial - Mujeres',

        'Temporal - Hombres',

        'Temporal - Mujeres',

        'Total Hombres',

        'Total Mujeres',

        'Total'

      ];


      campos = [

        'grupo',

        'sinDiscapacidadH',

        'sinDiscapacidadM',

        'conDiscapacidadH',

        'conDiscapacidadM',

        'permanenteCompletoH',

        'permanenteCompletoM',

        'permanenteParcialH',

        'permanenteParcialM',

        'temporalH',

        'temporalM',

        'totalH',

        'totalM',

        'total'

      ];

    }


    // ==========================================================
    // EDAD
    // ==========================================================

    else if (
      this.agrupadoPor ===
      'edad'
    ) {

      encabezados = [

        'Grupo de ocupación',

        '<= 11 Hombres',

        '<= 11 Mujeres',

        '12-17 Hombres',

        '12-17 Mujeres',

        '18-29 Hombres',

        '18-29 Mujeres',

        '30-64 Hombres',

        '30-64 Mujeres',

        '> 64 Hombres',

        '> 64 Mujeres',

        'Total Hombres',

        'Total Mujeres',

        'Total'

      ];


      campos = [

        'grupo',

        'menorIgual11H',

        'menorIgual11M',

        'de12A17H',

        'de12A17M',

        'de18A29H',

        'de18A29M',

        'de30A64H',

        'de30A64M',

        'mayor64H',

        'mayor64M',

        'totalH',

        'totalM',

        'total'

      ];

    }


    // ==========================================================
    // HORAS
    // ==========================================================

    else {

      encabezados = [

        'Grupo de ocupación',

        'Horas normales',

        'Horas extras',

        'Total horas',

        'Sueldo mes Hombres',

        'Sueldo mes Mujeres',

        'Total sueldo mes',

        `Sueldo ${this.anio} Hombres`,

        `Sueldo ${this.anio} Mujeres`,

        `Total sueldo ${this.anio}`

      ];


      campos = [

        'grupo',

        'horasNormales',

        'horasExtras',

        'totalHoras',

        'sueldoMesH',

        'sueldoMesM',

        'sueldoMesTotal',

        'sueldoAnioH',

        'sueldoAnioM',

        'sueldoAnioTotal'

      ];

    }


    let tabla =
      '<table border="1">';


    // ==========================================================
    // CABECERA
    // ==========================================================

    tabla +=
      '<thead><tr>';


    encabezados.forEach(
      encabezado => {

        tabla +=
          `<th>${this.escaparHtml(encabezado)}</th>`;

      }
    );


    tabla +=
      '</tr></thead>';


    // ==========================================================
    // DETALLE
    // ==========================================================

    tabla +=
      '<tbody>';


    filas.forEach(
      fila => {

        tabla +=
          '<tr>';


        campos.forEach(
          campo => {

            const valor =
              (fila as any)[campo]
              ??
              '';


            tabla +=
              `<td>${this.escaparHtml(valor)}</td>`;

          }
        );


        tabla +=
          '</tr>';

      }
    );


    // ==========================================================
    // TOTAL
    // ==========================================================

    if (
      this.pinnedBottomRowData.length > 0
    ) {

      const total =
        this.pinnedBottomRowData[0];


      tabla +=
        '<tr style="font-weight:bold;">';


      campos.forEach(
        (
          campo,
          index
        ) => {

          if (
            index === 0
          ) {

            tabla +=
              '<td>TOTAL</td>';

          }
          else {

            tabla +=
              `<td>${(total as any)[campo] ?? 0}</td>`;

          }

        }
      );


      tabla +=
        '</tr>';

    }


    tabla +=
      '</tbody></table>';


    const html =
      `
      <html>

        <head>

          <meta charset="UTF-8">

        </head>

        <body>

          <h2>
            Personal Ocupado
          </h2>

          <p>
            Mes: ${this.mes}
            -
            Año: ${this.anio}
          </p>

          ${tabla}

        </body>

      </html>
      `;


    const blob =
      new Blob(
        [
          '\uFEFF',
          html
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


    link.href =
      url;


    link.download =
      `Personal_Ocupado_${this.anio}_${this.mes}_${this.agrupadoPor}.xls`;


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


  // ============================================================
  // CANCELAR
  // ============================================================

  cancelar(): void {

    this.mes =
      new Date().getMonth() + 1;


    this.anio =
      new Date().getFullYear();


    this.agrupadoPor =
      'contrato';


    this.rowData =
      [];


    this.pinnedBottomRowData =
      [];


    this.respuesta =
      null;


    this.consultado =
      false;


    this.mensaje =
      '';


    this.actualizarColumnas();


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
  // DECIMALES
  //
  // Punto decimal
  // ============================================================

  private formatearDecimal(
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
  // ERROR
  // ============================================================

  private obtenerMensajeError(
    error:
      HttpErrorResponse
  ): string {

    if (
      typeof error.error ===
      'string'
    ) {

      return error.error;

    }


    if (
      error.error?.message
    ) {

      return error.error.message;

    }


    if (
      error.error?.mensaje
    ) {

      return error.error.mensaje;

    }


    return (
      'No se pudo generar el reporte de Personal Ocupado.'
    );

  }


  // ============================================================
  // ESCAPAR HTML
  // ============================================================

  private escaparHtml(
    valor:
      unknown
  ): string {

    return (
      valor
      ??
      ''
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
        '&#039;'
      );

  }

}