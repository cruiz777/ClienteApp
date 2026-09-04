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
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';

import {
  CalcularImpuestoRentaRequest,
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

  form!: FormGroup;

  cargando = false;

  guardando = false;

  rowData:
    ImpuestoRentaResponse[] = [];

  pinnedBottomRowData:
    any[] = [];

  private gridApi?: GridApi;

  overlayNoRowsTemplate =
    '<span style="padding:10px;">No existen datos para mostrar.</span>';


  // ==========================================================
  // CONFIGURACIÓN GENERAL
  // ==========================================================

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };


  // ==========================================================
  // COLUMNAS
  // ==========================================================

  columnDefs: ColDef[] = [

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
      width: 125,
      minWidth: 110
    },

    {
      headerName: 'Cédula',
      field: 'cedula',
      width: 120,
      minWidth: 110
    },

    {
      headerName: 'Cod. Sectorial',
      field: 'codigoSectorial',
      width: 130,
      minWidth: 115
    },

    {
      headerName: 'Nombre',
      field: 'empleado',
      width: 270,
      minWidth: 220
    },

    {
      headerName: 'N.º Días',
      field: 'diasTrabajados',
      width: 90,
      minWidth: 80,
      cellClass: 'text-center'
    },

    {
      headerName: 'Base Imponible',
      field: 'baseImponible',
      width: 135,

      valueFormatter:
        params =>
          this.formatearNumero(
            params.value
          ),

      cellClass:
        'cell-money cell-base'
    },

    {
      headerName: 'Imp. Renta Anual',
      field: 'impuestoRentaAnual',
      width: 145,

      valueFormatter:
        params =>
          this.formatearNumero(
            params.value
          ),

      cellClass:
        'cell-money'
    },

    {
      headerName: 'Rebaja',
      field: 'rebaja',
      width: 110,

      valueFormatter:
        params =>
          this.formatearNumero(
            params.value
          ),

      cellClass:
        'cell-money cell-rebaja'
    },

    {
      headerName: 'Impuesto Causado',
      field: 'impuestoCausado',
      width: 145,

      valueFormatter:
        params =>
          this.formatearNumero(
            params.value
          ),

      cellClass:
        'cell-money cell-causado'
    },

    {
      headerName: 'Impuesto Pagado',
      field: 'impuestoPagado',
      width: 145,

      valueFormatter:
        params =>
          this.formatearNumero(
            params.value
          ),

      cellClass:
        'cell-money cell-pagado'
    },

    {
      headerName: 'Diferencia',
      field: 'diferencia',
      width: 120,

      valueFormatter:
        params =>
          this.formatearNumero(
            params.value
          ),

      cellClass:
        params => {

          const valor =
            Number(
              params.value ?? 0
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
      headerName: 'Fecha Ing.',
      field: 'fechaIngreso',
      width: 115,

      valueFormatter:
        params =>
          this.formatearFecha(
            params.value
          )
    },

    {
      headerName: 'Fecha Sal.',
      field: 'fechaSalida',
      width: 115,

      valueFormatter:
        params =>
          this.formatearFecha(
            params.value
          )
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
      ImpuestoRentaService
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.form =
      this.fb.group({

        fechaPeriodo: [
          this.obtenerFinMesActual(),
          Validators.required
        ],

        idEmpresa: [
          1,
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
        ]
      });
  }


  // ==========================================================
  // GRID READY
  // ==========================================================

  onGridReady(
    event: GridReadyEvent
  ): void {

    this.gridApi =
      event.api;
  }


  // ==========================================================
  // CONSULTAR / CALCULAR
  // ==========================================================

  consultar(): void {

    if (this.form.invalid) {

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
  // ==========================================================

  grabar(): void {

    if (
      this.rowData.length === 0)
    {
      alert(
        'No existen datos para grabar.'
      );

      return;
    }

    if (
      this.guardando ||
      this.cargando)
    {
      return;
    }

    const confirmar =
      window.confirm(
        '¿Desea grabar la información de Impuesto a la Renta?'
      );

    if (!confirmar) {
      return;
    }

    const value =
      this.form
        .getRawValue();

    /*
     * IMPORTANTE:
     *
     * Temporalmente se utiliza 1.
     *
     * Luego debes reemplazarlo por el
     * id del usuario autenticado.
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

            /*
             * IMPORTANTE:
             *
             * Mandamos "" y no null para
             * evitar problemas con clientes
             * antiguos / validación automática.
             */
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
              error?.error?.message)
            {
              mensaje =
                error.error.message;
            }
            else if (
              error?.error?.errors)
            {
              const errores =
                error.error.errors;

              mensaje =
                Object.keys(
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
  // LIMPIAR
  // ==========================================================

  limpiar(): void {

    this.form
      .patchValue({

        fechaPeriodo:
          this.obtenerFinMesActual(),

        idEmpresa:
          1,

        idLocal:
          null,

        idEmpleado:
          null
      });

    this.rowData =
      [];

    this.pinnedBottomRowData =
      [];

    this.gridApi
      ?.setFilterModel(
        null
      );
  }


  // ==========================================================
  // TOTALES
  // ==========================================================

  private calcularTotales(): void {

    if (
      this.rowData.length === 0)
    {
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
  // SUMA
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
            ))
          {
            return total;
          }

          return (
            total +
            valor
          );
        },
        0
      );
  }


  // ==========================================================
  // FORMATEAR NUMERO
  // ==========================================================

  formatearNumero(
    value: any
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
      ))
    {
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
  // FORMATEAR FECHA
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
      partes.length !== 3)
    {
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
    value: any
  ): number | null {

    if (
      value === null ||
      value === undefined ||
      value === '')
    {
      return null;
    }

    const numero =
      Number(
        value
      );

    if (
      !Number.isFinite(
        numero
      ))
    {
      return null;
    }

    return numero;
  }


  // ==========================================================
  // FIN DE MES ACTUAL
  //
  // El legacy trabaja con fecha fin de período.
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
// ESCAPAR HTML
// ==========================================================

private escapeHtml(
  value: string | null | undefined
): string {

  if (!value) {
    return '';
  }

  return value
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
// ==========================================================
// IMPRIMIR
// ==========================================================

imprimir(): void {

  if (this.rowData.length === 0) {

    alert(
      'No existen datos para imprimir.'
    );

    return;
  }

  const value =
    this.form.getRawValue();

  const fechaPeriodo =
    value.fechaPeriodo;

  if (!fechaPeriodo) {

    alert(
      'Debe seleccionar un período.'
    );

    return;
  }

  const anio =
    Number(
      fechaPeriodo.substring(
        0,
        4
      )
    );

  const fechaDesde =
    `01/01/${anio}`;

  const fechaHasta =
    `31/12/${anio}`;

  const ventana =
    window.open(
      '',
      '_blank',
      'width=1400,height=900'
    );

  if (!ventana) {

    alert(
      'El navegador bloqueó la ventana de impresión.'
    );

    return;
  }


  // ========================================================
  // FILAS
  // ========================================================

  const filas =
    this.rowData
      .map(
        item => `
          <tr>
            <td>${this.escapeHtml(item.local)}</td>

            <td>${this.escapeHtml(item.numeroAfiliacion)}</td>

            <td>${this.escapeHtml(item.cedula)}</td>

            <td>${this.escapeHtml(item.codigoSectorial)}</td>

            <td class="nombre">
              ${this.escapeHtml(item.empleado)}
            </td>

            <td class="centro">
              ${item.diasTrabajados ?? 0}
            </td>

            <td class="numero">
              ${this.formatearNumero(item.baseImponible)}
            </td>

            <td class="numero">
              ${this.formatearNumero(item.impuestoRentaAnual)}
            </td>

            <td class="numero">
              ${this.formatearNumero(item.rebaja)}
            </td>

            <td class="numero">
              ${this.formatearNumero(item.impuestoCausado)}
            </td>

            <td class="numero">
              ${this.formatearNumero(item.impuestoPagado)}
            </td>

            <td class="numero">
              ${this.formatearNumero(item.diferencia)}
            </td>

            <td class="centro">
              ${this.formatearFecha(item.fechaIngreso)}
            </td>

            <td class="centro">
              ${this.formatearFecha(item.fechaSalida)}
            </td>

            <td class="centro">
              ${item.cargas ?? 0}
            </td>

            <td class="numero">
              ${this.formatearNumero(item.gastosPersonales)}
            </td>
          </tr>
        `
      )
      .join('');


  // ========================================================
  // TOTALES
  // ========================================================

  const totalDias =
    this.sumar(
      'diasTrabajados'
    );

  const totalBase =
    this.sumar(
      'baseImponible'
    );

  const totalIrAnual =
    this.sumar(
      'impuestoRentaAnual'
    );

  const totalRebaja =
    this.sumar(
      'rebaja'
    );

  const totalCausado =
    this.sumar(
      'impuestoCausado'
    );

  const totalPagado =
    this.sumar(
      'impuestoPagado'
    );

  const totalDiferencia =
    this.sumar(
      'diferencia'
    );

  const totalCargas =
    this.sumar(
      'cargas'
    );

  const totalGastos =
    this.sumar(
      'gastosPersonales'
    );


  // ========================================================
  // HTML DEL REPORTE
  // ========================================================

  ventana.document.write(`
    <!DOCTYPE html>

    <html>

    <head>

      <meta charset="utf-8">

      <title>
        Impuesto a la Renta ${anio}
      </title>

      <style>

        @page {
          size: A4 landscape;
          margin: 8mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family:
            Arial,
            Helvetica,
            sans-serif;

          margin: 0;

          padding: 0;

          color: #111;
        }

        .cabecera {
          text-align: center;
          margin-bottom: 12px;
        }

        .cabecera h1 {
          margin: 0;
          font-size: 17px;
        }

        .cabecera h2 {
          margin: 4px 0;
          font-size: 13px;
          font-weight: 600;
        }

        .periodo {
          margin-top: 5px;
          font-size: 10px;
        }

        .resumen {
          margin-bottom: 7px;
          font-size: 9px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-size: 6.5px;
        }

        thead {
          display: table-header-group;
        }

        tfoot {
          display: table-footer-group;
        }

        tr {
          page-break-inside: avoid;
        }

        th {
          background: #eeeeee;
          border: 1px solid #777;
          padding: 3px 2px;
          text-align: center;
          font-weight: bold;
          white-space: nowrap;
        }

        td {
          border: 1px solid #aaa;
          padding: 2px;
          white-space: nowrap;
        }

        td.nombre {
          min-width: 120px;
          white-space: normal;
        }

        td.numero {
          text-align: right;
        }

        td.centro {
          text-align: center;
        }

        .totales td {
          font-weight: bold;
          background: #eeeeee;
          border-top: 2px solid #333;
        }

        .pie {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 8px;
        }

        @media print {

          .no-print {
            display: none;
          }

        }

      </style>

    </head>

    <body>

      <div class="cabecera">

        <h1>
          IMPUESTO A LA RENTA
        </h1>

        <h2>
          NÓMINA ESPECIAL
        </h2>

        <div class="periodo">
          PERIODO DESDE:
          <strong>${fechaDesde}</strong>

          &nbsp;&nbsp;

          HASTA:
          <strong>${fechaHasta}</strong>
        </div>

      </div>


      <div class="resumen">
        Empleados:
        <strong>
          ${this.rowData.length}
        </strong>
      </div>


      <table>

        <thead>

          <tr>

            <th>Local</th>

            <th>N.º Afiliación</th>

            <th>Cédula</th>

            <th>Cod. Sectorial</th>

            <th>Nombre</th>

            <th>N.º Días</th>

            <th>Base Imponible</th>

            <th>Imp. Renta Anual</th>

            <th>Rebaja</th>

            <th>Imp. Causado</th>

            <th>Imp. Pagado</th>

            <th>Diferencia</th>

            <th>Fecha Ing.</th>

            <th>Fecha Sal.</th>

            <th>Cargas</th>

            <th>G. Personal</th>

          </tr>

        </thead>


        <tbody>

          ${filas}

        </tbody>


        <tfoot>

          <tr class="totales">

            <td>
              TOTALES
            </td>

            <td></td>

            <td></td>

            <td></td>

            <td></td>

            <td class="centro">
              ${totalDias}
            </td>

            <td class="numero">
              ${this.formatearNumero(totalBase)}
            </td>

            <td class="numero">
              ${this.formatearNumero(totalIrAnual)}
            </td>

            <td class="numero">
              ${this.formatearNumero(totalRebaja)}
            </td>

            <td class="numero">
              ${this.formatearNumero(totalCausado)}
            </td>

            <td class="numero">
              ${this.formatearNumero(totalPagado)}
            </td>

            <td class="numero">
              ${this.formatearNumero(totalDiferencia)}
            </td>

            <td></td>

            <td></td>

            <td class="centro">
              ${totalCargas}
            </td>

            <td class="numero">
              ${this.formatearNumero(totalGastos)}
            </td>

          </tr>

        </tfoot>

      </table>


      <div class="pie">

        <span>
          Generado:
          ${new Date().toLocaleString('es-EC')}
        </span>

        <span>
          ROL3000
        </span>

      </div>

    </body>

    </html>
  `);

  ventana.document.close();

  ventana.focus();

  setTimeout(
    () => {

      ventana.print();

    },
    300
  );
}
}