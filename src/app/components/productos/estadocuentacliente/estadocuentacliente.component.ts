import { Component, OnInit } from '@angular/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { finalize } from 'rxjs/operators';
import { ClienteService, ClienteIndividual } from 'src/app/services/cliente.service';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { Cliente } from 'src/app/interfaces/cliente';
import * as XLSX from 'xlsx';


import {
  EstadoCuentaService,
  SaldoFacturaDetalladoResponse,
  SaldoFacturaItemResponse
} from 'src/app/services/estado-cuenta.service';



interface EstadoCuentaRow {
  factura: string;
  documento: string;
  fecha: string;
  tipoDocumento: string;   // F, P, A, NC
  valor: number;
  pago: number;
  debe: number;
  haber: number;
  saldo: number;
  observacion: string;
  saldoFactura?: number | null; // valor de la factura (solo en la fila F)
}

@Component({
  selector: 'app-estadocuentacliente',
  templateUrl: './estadocuentacliente.component.html',
  styleUrls: ['./estadocuentacliente.component.css']
})
export class EstadocuentaclienteComponent implements OnInit {

  hoy: Date = new Date();
  clienteE!: ClienteIndividual;
  clienteSeleccionado: Cliente | null = null;
  // filtros de fecha (solo visuales por ahora)
  fechaDesde: string = '';
  fechaHasta: string = '';

  // cliente a consultar (por ahora fijo; luego puedes poner un input/autocomplete)
  clienteCodigo: number | null = null;
  

  // AG Grid API para exportar / paginar
  private gridApi!: GridApi;

  // se llenará con los datos que vengan del servicio
  clientes: Cliente[] = [];

  // opciones de impresión
  opcionesImpresionVisibles = false;

  // flags
  loading = false;
  errorMessage = '';

  // datos del grid
  rowData: EstadoCuentaRow[] = [];

  // formateador de moneda para AG Grid (punto decimal)
  monedaFormatter = (params: any) => {
    if (params.value == null || params.value === '') {
      return '';
    }
    const valor = Number(params.value);

    // en-US → separador decimal = punto, miles = coma
    return valor.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // ORDEN DE COLUMNAS:
  // factura, documento, fecha, tipo documento, debe, haber, saldo factura, saldo, observacion.
  columnDefs: ColDef[] = [
    { headerName: 'Factura', field: 'factura', width: 150 },
    { headerName: 'Documento', field: 'documento', width: 110 },
    { headerName: 'Fecha', field: 'fecha', width: 110 },
    {
      headerName: 'Tipo Doc',
      field: 'tipoDocumento',
      width: 100
    },
    {
      headerName: 'Debe',
      field: 'debe',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Haber',
      field: 'haber',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Saldo Factura',
      field: 'saldoFactura',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 130
    },
    {
      headerName: 'Saldo',
      field: 'saldo',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Observación',
      field: 'observacion',
      flex: 1,
      minWidth: 220
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    cellClass: 'celda-centro'
  };

  constructor(private estadoCuentaService: EstadoCuentaService,
    private clienteService: ClienteService,
    private clienteSeleccionadoService: ClienteSeleccionadoService,
  ) {}

  ngOnInit(): void {
    this.cargarClienteInv();
    this.cargarEstadoCuenta();
    

  }
  cargarClienteInv(): void {
    
    const cliente = this.clienteSeleccionadoService.obtenerClienteActual();
    console.log('[ClienteSeleccionadoService] actual →', cliente);

    if (cliente) {
      this.clienteSeleccionado = cliente;
      
    }
  }

  /** Cliente actual (primer item del arreglo) */
  get clienteActual(): Cliente | null {
    return this.clientes.length > 0 ? this.clientes[0] : null;
  }

  // Totales generales
  get totalDebe(): number {
    return this.rowData.reduce((acc, r) => acc + (r.debe || 0), 0);
  }

  get totalHaber(): number {
    return this.rowData.reduce((acc, r) => acc + (r.haber || 0), 0);
  }

  // Saldo general = Debe - Haber
  get totalSaldo(): number {
    return this.totalDebe - this.totalHaber;
  }

  /** Llamada al API /EstadoCuenta/saldo-facturas/cliente/{clienteCodigo} */
  private cargarEstadoCuenta(): void {
    this.loading = true;
    this.errorMessage = '';

    this.estadoCuentaService
      .getSaldoFacturasPorCliente(this.clienteSeleccionado?.clientes_codigo ?? 0, true, 1, 50)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: resp => {
          if (resp.type !== 'success' || !resp.data) {
            this.errorMessage = resp.message || 'Error al consultar el estado de cuenta.';
            return;
          }

          const data: SaldoFacturaDetalladoResponse = resp.data;

          // Tomamos el primer cliente (el API viene paginado pero por cliente)
          const cli = data.resumenPorCliente.items[0];
          
          if (!cli) {
            this.errorMessage = 'No se encontraron datos para el cliente.';
            this.rowData = [];
            return;
          }

          // llenar datos del cliente (dirección/teléfono no vienen en este API)
          // this.clientes = [
          //   {
          //     id: Number(cli.clienteCodigo),
          //     nombre: cli.cliente,
          //     direccion: '',
          //     telefono: '',
          //     prefijo: cli.clienteCodigo
          //   }
          // ];

          // mapear detalle -> filas del grid
          const rows: EstadoCuentaRow[] = cli.detalle.map((item: SaldoFacturaItemResponse) => ({
            factura: item.numeroFactura,
            documento: item.numeroDocumento,
            fecha: item.fecha,
            tipoDocumento: item.tipDoc,
            valor: 0, // no viene del API
            pago: 0,  // no viene del API
            debe: item.debe ?? 0,
            haber: item.haber ?? 0,
            saldo: item.saldoLinea,
            observacion: item.observacion || '',
            saldoFactura: null
          }));

          // calcular SALDO FACTURA (valor de la factura solo en la F)
          this.rowData = this.calcularSaldoPorFactura(rows);
        },
        error: err => {
          console.error(err);
          this.errorMessage = 'No tiene información';
          this.rowData = [];
        }
      });
  }

  /**
   * Muestra en la columna "Saldo Factura" el VALOR DE LA FACTURA
   * (suma de Debe por factura) SOLO en la fila cuyo tipoDocumento = 'F'.
   * En el resto de filas pone 0.
   */
  private calcularSaldoPorFactura(rows: EstadoCuentaRow[]): EstadoCuentaRow[] {
    const mapFacturas = new Map<string, { debe: number; haber: number }>();

    // 1) Acumular por factura
    for (const row of rows) {
      if (!mapFacturas.has(row.factura)) {
        mapFacturas.set(row.factura, { debe: 0, haber: 0 });
      }
      const acum = mapFacturas.get(row.factura)!;
      acum.debe += row.debe || 0;
      acum.haber += row.haber || 0;
    }

    // 2) Inicialmente, limpiar saldoFactura
    rows.forEach(r => (r.saldoFactura = null));

    // 3) Para cada factura, poner el VALOR (total Debe) en la fila F
    const facturas = Array.from(mapFacturas.keys());

    facturas.forEach(factura => {
      const resumen = mapFacturas.get(factura)!;
      const valorFactura = resumen.debe;   // monto facturado

      // buscar la fila F de esa factura
      let indexFactura = rows.findIndex(
        r => r.factura === factura && r.tipoDocumento === 'F'
      );

      // si no hay F, usar alguna fila de esa factura (por seguridad)
      if (indexFactura === -1) {
        const indicesFactura = rows
          .map((r, index) => ({ r, index }))
          .filter(x => x.r.factura === factura)
          .map(x => x.index);

        if (indicesFactura.length > 0) {
          indexFactura = indicesFactura[0];
        }
      }

      if (indexFactura !== -1) {
        rows[indexFactura].saldoFactura = valorFactura;
      }
    });

    // 4) 🔴 Aquí forzamos que TODAS las demás filas tengan 0
    rows.forEach(r => {
      if (r.saldoFactura == null) {
        r.saldoFactura = 0;
      }
    });

    return rows;
  }

  // AG Grid listo
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  nuevaConsulta(): void {
    this.cargarClienteInv();
    this.cargarEstadoCuenta();
  }

  toggleOpcionesImpresion(): void {
    this.opcionesImpresionVisibles = !this.opcionesImpresionVisibles;
  }

 

  exportarPdf(): void {
    console.log('Exportar a PDF (pendiente de implementación real)');
    alert('Exportar a PDF: implementar con jsPDF o servicio de reportes.');
    this.opcionesImpresionVisibles = false;
  }

  cancelar(): void {
    console.log('Cancelar');
    // cerrar dialog, navegar atrás, etc.
  }

  // (opcional) formateador si quisieras usarlo en el template
  formatNumero(value: number): string {
    if (value == null) {
      return '';
    }
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  exportarExcel(): void {
  if (!this.rowData || this.rowData.length === 0) {
    alert('No hay información para exportar.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const hoja: any[][] = [];
  const merges: XLSX.Range[] = [];

  const cli = this.clienteSeleccionado;
  let rowIndex = 0; // índice de fila 1-based para Excel

  const addRow = (values: any[]): number => {
    hoja.push(values);
    rowIndex++;
    return rowIndex; // devuelve nº de fila (1-based)
  };

  // ====== TÍTULO ======
  const rTitulo = addRow(['ESTADO DE CUENTA']);
  // Combinar de A1 a I1
  merges.push({ s: { r: rTitulo - 1, c: 0 }, e: { r: rTitulo - 1, c: 8 } });

  addRow([]); // fila en blanco

  // ====== DATOS DEL CLIENTE ======
  if (cli) {
    const rCli = addRow(['Cliente:', cli.nomcli]);
    merges.push({ s: { r: rCli - 1, c: 1 }, e: { r: rCli - 1, c: 8 } });

    const rDir = addRow(['Dirección:', cli.dircli]);
    merges.push({ s: { r: rDir - 1, c: 1 }, e: { r: rDir - 1, c: 8 } });

    const rTel = addRow(['Teléfono:', cli.telefono]);
    merges.push({ s: { r: rTel - 1, c: 1 }, e: { r: rTel - 1, c: 8 } });
  }

  const rFecha = addRow([
    'Fecha del reporte:',
    this.hoy.toLocaleDateString('es-EC')
  ]);
  merges.push({ s: { r: rFecha - 1, c: 1 }, e: { r: rFecha - 1, c: 8 } });

  addRow([]); // fila en blanco

  // ====== CABECERA TABLA ======
  const rHeader = addRow([
    'Factura',
    'Documento',
    'Fecha',
    'Tipo Doc',
    'Debe',
    'Haber',
    'Saldo Factura',
    'Saldo',
    'Observación'
  ]);

  const firstDetailRow = rHeader + 1;

  // ====== DETALLE ======
  this.rowData.forEach(r => {
    addRow([
      r.factura,
      r.documento,
      r.fecha,
      r.tipoDocumento,
      r.debe,
      r.haber,
      r.saldoFactura,
      r.saldo,
      r.observacion
    ]);
  });

  const lastDetailRow = rowIndex;

  // ====== TOTALES ======
  addRow([]);
  const rTotTitulo = addRow(['TOTAL GENERAL']);
  // Combinar TOTAL GENERAL en A..C
  merges.push({ s: { r: rTotTitulo - 1, c: 0 }, e: { r: rTotTitulo - 1, c: 2 } });

  const rTotDebe = addRow(['Debe:', this.totalDebe]);
  const rTotHaber = addRow(['Haber:', this.totalHaber]);
  const rTotSaldo = addRow(['Saldo:', this.totalSaldo]);

  // ====== CREAR SHEET ======
  const ws = XLSX.utils.aoa_to_sheet(hoja);

  // Merges
  (ws as any)['!merges'] = merges;

  // Anchos de columnas
  (ws as any)['!cols'] = [
    { wch: 18 }, // Factura
    { wch: 14 }, // Documento
    { wch: 12 }, // Fecha
    { wch: 10 }, // Tipo Doc
    { wch: 12 }, // Debe
    { wch: 12 }, // Haber
    { wch: 14 }, // Saldo Factura
    { wch: 12 }, // Saldo
    { wch: 40 }  // Observación
  ];

  // ====== FORMATO NUMÉRICO PARA COLUMNAS MONETARIAS ======
  const numericCols = ['E', 'F', 'G', 'H'];

  // Detalle
  for (let excelRow = firstDetailRow; excelRow <= lastDetailRow; excelRow++) {
    numericCols.forEach(col => {
      const ref = `${col}${excelRow}`;
      const cell = (ws as any)[ref];
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = '#,##0.00';
      }
    });
  }

  // Totales (column B)
  [rTotDebe, rTotHaber, rTotSaldo].forEach(r => {
    const ref = `B${r}`;
    const cell = (ws as any)[ref];
    if (cell && typeof cell.v === 'number') {
      cell.t = 'n';
      cell.z = '#,##0.00';
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, 'EstadoCuenta');

  const nombreArchivo =
    `estado_cuenta_${cli?.clientes_codigo ?? ''}_${this.hoy
      .toISOString()
      .substring(0, 10)}.xlsx`;

  XLSX.writeFile(wb, nombreArchivo);

  this.opcionesImpresionVisibles = false;
}

}
