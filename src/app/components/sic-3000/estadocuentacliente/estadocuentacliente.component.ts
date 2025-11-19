import { Component, OnInit } from '@angular/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

interface Cliente {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  prefijo: string;
}

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
  saldoFactura?: number | null; // saldo global por factura (solo última fila)
}

@Component({
  selector: 'app-estadocuentacliente',
  templateUrl: './estadocuentacliente.component.html',
  styleUrls: ['./estadocuentacliente.component.css']
})
export class EstadocuentaclienteComponent implements OnInit {

  hoy: Date = new Date();

  // filtros de fecha
  fechaDesde: string = '';
  fechaHasta: string = '';

  // AG Grid API para exportar / paginar
  private gridApi!: GridApi;

  clientes: Cliente[] = [
    {
      id: 1,
      nombre: 'EMIHANA CIA. LTDA.',
      direccion: 'VIA A CAYAMBE PANAMERICANA NORTE 3 1/2 SECTOR ISHIGTO',
      telefono: '593-02-2363495',
      prefijo: '12212'
    }
  ];

  // opciones de impresión
  opcionesImpresionVisibles = false;

  // formateador de moneda para AG Grid
  monedaFormatter = (params: any) => {
    if (params.value == null || params.value === '') {
      return '';
    }
    const valor = Number(params.value);
    return valor.toLocaleString('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // ORDEN DE COLUMNAS:
  // factura, documento, fecha, tipo documento ,valor, pago,debe, haber, saldo, saldo factura , observacion.
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
      headerName: 'Valor',
      field: 'valor',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
    },
    {
      headerName: 'Pago',
      field: 'pago',
      type: 'numericColumn',
      valueFormatter: this.monedaFormatter,
      width: 110
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
      headerName: 'Saldo',
      field: 'saldo',
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

  // datos de ejemplo basados en el PDF, con tipoDocumento
  rowData: EstadoCuentaRow[] = [
    {
      factura: '001001000046245',
      documento: '',
      fecha: '18/05/2017',
      tipoDocumento: 'F',
      valor: 1710.0,
      pago: 0,
      debe: 1710.0,
      haber: 0,
      saldo: 1710.0,
      observacion: 'MANTENIMIENTO ANUAL PREFIJO: 212441 MAYO 2017-DICIEMBRE 2017'
    },
    {
      factura: '001001000046245',
      documento: '3250',
      fecha: '29/05/2017',
      tipoDocumento: 'P',
      valor: 0,
      pago: 1470.0,
      debe: 0,
      haber: 1470.0,
      saldo: 240.0,
      observacion: 'CHEQUE BANCO PICHINCHA No.CHEQUE 31397 - RETENCIÓN IVA'
    },
    {
      factura: '001010000003911',
      documento: '',
      fecha: '14/10/2022',
      tipoDocumento: 'F',
      valor: 5115.04,
      pago: 0,
      debe: 5115.04,
      haber: 0,
      saldo: 5355.04,
      observacion: 'MANTENIMIENTO ANUAL Prefijo: 12212 Octubre 2022–Setiembre 2023'
    },
    {
      factura: '001010000003911',
      documento: '21699',
      fecha: '17/10/2022',
      tipoDocumento: 'P',
      valor: 0,
      pago: 4567.0,
      debe: 0,
      haber: 4567.0,
      saldo: 788.04,
      observacion: 'TRANSFERENCIA PICHINCHA - RETENCIÓN IVA'
    },
    {
      factura: '001010000006599',
      documento: '',
      fecha: '10/03/2025',
      tipoDocumento: 'F',
      valor: 1288.0,
      pago: 0,
      debe: 1288.0,
      haber: 0,
      saldo: 2076.04,
      observacion: 'MANTENIMIENTO ANUAL PREFIJO: 12212 ENERO 2025 HASTA DICIEMBRE 2025'
    },
    {
      factura: '001010000006599',
      documento: '29534',
      fecha: '13/03/2025',
      tipoDocumento: 'P',
      valor: 0,
      pago: 1120.0,
      debe: 0,
      haber: 1120.0,
      saldo: 956.04,
      observacion: 'TRANSFERENCIA PICHINCHA - RETENCIÓN IVA'
    }
  ];

  ngOnInit(): void {
    this.calcularSaldoPorFactura();
  }

  get clienteActual(): Cliente {
    // Solo lectura, primer cliente (no desplegable)
    return this.clientes[0];
  }

  // Totales generales (usando saldos de factura para el total de saldo)
  get totalValor(): number {
    return this.rowData.reduce((acc, r) => acc + (r.valor || 0), 0);
  }

  get totalPago(): number {
    return this.rowData.reduce((acc, r) => acc + (r.pago || 0), 0);
  }

  get totalDebe(): number {
    return this.rowData.reduce((acc, r) => acc + (r.debe || 0), 0);
  }

  get totalHaber(): number {
    return this.rowData.reduce((acc, r) => acc + (r.haber || 0), 0);
  }

  get totalSaldo(): number {
    // sumamos solo las filas que tienen saldoFactura (últimas por factura)
    return this.rowData.reduce((acc, r) => acc + (r.saldoFactura || 0), 0);
  }

  /**
   * Calcula el SALDO POR FACTURA:
   *   saldoFactura = ΣDebe - ΣHaber por cada número de factura
   * y lo asigna SOLO a la ÚLTIMA línea de cada factura.
   */
  private calcularSaldoPorFactura(): void {
    const mapFacturas = new Map<string, { debe: number; haber: number }>();

    // 1) Acumular por factura
    for (const row of this.rowData) {
      if (!mapFacturas.has(row.factura)) {
        mapFacturas.set(row.factura, { debe: 0, haber: 0 });
      }
      const acum = mapFacturas.get(row.factura)!;
      acum.debe += row.debe || 0;
      acum.haber += row.haber || 0;
    }

    // 2) Inicialmente, limpiar saldoFactura
    this.rowData.forEach(r => (r.saldoFactura = null));

    // 3) Para cada factura, buscar la ÚLTIMA fila y ahí poner el saldo
    const facturas = Array.from(mapFacturas.keys());

    facturas.forEach(factura => {
      const resumen = mapFacturas.get(factura)!;
      const saldo = resumen.debe - resumen.haber;

      const indicesFactura = this.rowData
        .map((r, index) => ({ r, index }))
        .filter(x => x.r.factura === factura)
        .map(x => x.index);

      if (indicesFactura.length > 0) {
        const lastIndex = indicesFactura[indicesFactura.length - 1];
        this.rowData[lastIndex].saldoFactura = saldo;
      }
    });
  }

  // AG Grid listo
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  nuevaConsulta(): void {
    console.log('Nueva consulta');
    // Aquí puedes limpiar filtros y volver a cargar desde el backend
  }

  toggleOpcionesImpresion(): void {
    this.opcionesImpresionVisibles = !this.opcionesImpresionVisibles;
  }

  exportarExcel(): void {
    if (!this.gridApi) { return; }
    // Excel: usando CSV, que se abre directo en Excel
    this.gridApi.exportDataAsCsv({
      fileName: 'estado_cuenta_cliente.csv'
    });
    this.opcionesImpresionVisibles = false;
  }

  exportarPdf(): void {
    // Aquí luego puedes integrar jsPDF o similar.
    // Por ahora lo dejo como placeholder.
    console.log('Exportar a PDF (pendiente de implementación real)');
    alert('Exportar a PDF: implementar con jsPDF o servicio de reportes.');
    this.opcionesImpresionVisibles = false;
  }

  cancelar(): void {
    console.log('Cancelar');
    // cerrar dialog, navegar atrás, etc.
  }
}
