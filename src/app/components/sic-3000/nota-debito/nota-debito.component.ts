import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ISelectCellEditorParams,
} from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  selector: 'app-nota-debito',
  templateUrl: './nota-debito.component.html',
  styleUrls: ['./nota-debito.component.css'],
})
export class NotaDebitoComponent {
  // ===== Datos de cabecera / mock inicial =====
  sucursal = '001';
  caja = '010';
  numero = '';
  fecha: string | null = new Date().toISOString().substring(0, 10);
  cliente = '';
  factura = '';
  direccion = '';
  ruc = '';
  fechaActual: Date = new Date();
  observacion = '';

  // Porcentaje de IVA (ej. 15% = 0.15)
  ivaPorcentaje = 0.15;

  // ====== GRID: configuración por defecto ======
  defaultColDef: ColDef = {
    editable: true,
    resizable: true,
    sortable: false,
    filter: false,
  };

  // ====== GRID: Detalle ======
  detalleApi?: GridApi;

  detalleRowData: DetalleRow[] = [
    // fila de ejemplo; puedes empezar vacío si prefieres []
    { codigo: '', descripcion: '', cantidad: 0, pvp: 0, afectaIva: true, valorDev: 0 },
  ];

  detallePinnedBottom: any[] = [
    { totalLabel: 'Total Factura', total: 0, valorDev: 0 },
  ];

  detalleColumnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'totalLabel',
      width: 140,
      editable: false,
      colSpan: (p) => (p.node?.rowPinned ? 2 : 1),
      cellClass: (p) => (p.node?.rowPinned ? 'total-label-cell' : ''),
      valueGetter: (p) => (p.node?.rowPinned ? p.data.totalLabel : ''),
      suppressMovable: true,
      lockPosition: true,
    },
    { headerName: 'Código', field: 'codigo', width: 110 },
    { headerName: 'Descripción', field: 'descripcion', flex: 1, minWidth: 180 },
    {
      headerName: 'Cantidad',
      field: 'cantidad',
      width: 110,
      type: 'rightAligned',
      valueParser: numberParser,
    },
    {
      headerName: 'P.V.P.',
      field: 'pvp',
      width: 110,
      type: 'rightAligned',
      valueParser: numberParser,
      valueFormatter: currency,
    },
    {
      headerName: 'Total',
      field: 'total',
      width: 120,
      type: 'rightAligned',
      editable: false,
      valueGetter: (p) =>
        (toNumber(p.data?.cantidad) * toNumber(p.data?.pvp)) || 0,
      valueFormatter: currency,
    },
    {
      headerName: 'Afecta IVA',
      field: 'afectaIva',
      width: 110,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Sí', 'No'] } as ISelectCellEditorParams,
      valueSetter: (p) => ((p.data.afectaIva = p.newValue === 'Sí' || p.newValue === true), true),
      valueGetter: (p) => (p.data?.afectaIva ? 'Sí' : 'No'),
    },
    {
      headerName: 'Valor Dev.',
      field: 'valorDev',
      width: 120,
      type: 'rightAligned',
      valueParser: numberParser,
      valueFormatter: currency,
    },
  ];

  // ====== GRID: Pagos ======
  pagoApi?: GridApi;

  pagoRowData: PagoRow[] = [
    // fila de ejemplo
    { codigo: '', descripcion: '', debe: 0, haber: 0, saldo: 0, pago: 0, cuenta: '', aplicar: false },
  ];

  pagoPinnedBottom: any[] = [{ totalLabel: 'Total Pago', pago: 0 }];

  pagoColumnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'totalLabel',
      width: 140,
      editable: false,
      colSpan: (p) => (p.node?.rowPinned ? 2 : 1),
      cellClass: (p) => (p.node?.rowPinned ? 'total-label-cell' : ''),
      valueGetter: (p) => (p.node?.rowPinned ? p.data.totalLabel : ''),
      suppressMovable: true,
      lockPosition: true,
    },
    { headerName: 'Código', field: 'codigo', width: 110 },
    { headerName: 'Descripción', field: 'descripcion', flex: 1, minWidth: 180 },
    { headerName: 'Debe', field: 'debe', width: 110, type: 'rightAligned', valueParser: numberParser, valueFormatter: currency },
    { headerName: 'Haber', field: 'haber', width: 110, type: 'rightAligned', valueParser: numberParser, valueFormatter: currency },
    { headerName: 'Saldo', field: 'saldo', width: 110, type: 'rightAligned', valueParser: numberParser, valueFormatter: currency },
    { headerName: 'Pago', field: 'pago', width: 110, type: 'rightAligned', valueParser: numberParser, valueFormatter: currency },
    { headerName: 'Cuenta Cont.', field: 'cuenta', width: 140 },
    {
      headerName: 'Aplicar',
      field: 'aplicar',
      width: 100,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Sí', 'No'] } as ISelectCellEditorParams,
      valueSetter: (p) => ((p.data.aplicar = p.newValue === 'Sí' || p.newValue === true), true),
      valueGetter: (p) => (p.data?.aplicar ? 'Sí' : 'No'),
    },
  ];

  // ====== Totales panel derecho ======
  totales: Totales = {
    subtotal: 0,
    base0: 0,
    baseIva: 0,
    iva: 0,
    totalDev: 0,
    totalFactura: 0,
  };

  totalPago = 0;

  // ====== Eventos de GRID ======
  onDetalleReady(e: GridReadyEvent) {
    this.detalleApi = e.api;
    e.api.sizeColumnsToFit();
    this.recalcularTotales();
  }

  onPagoReady(e: GridReadyEvent) {
    this.pagoApi = e.api;
    e.api.sizeColumnsToFit();
    this.recalcularPago();
  }

  onDetalleEdited() {
    this.detalleApi?.refreshCells({ force: true });
    this.recalcularTotales();
  }

  // ====== Cálculos ======
  recalcularTotales() {
    let subtotal = 0;
    let base0 = 0;
    let baseIva = 0;
    let iva = 0;
    let totalDev = 0;

    (this.detalleRowData || []).forEach((r) => {
      const lineTotal = toNumber(r.cantidad) * toNumber(r.pvp);
      subtotal += lineTotal;
      if (r.afectaIva) baseIva += lineTotal;
      else base0 += lineTotal;
      totalDev += toNumber(r.valorDev);
    });

    iva = baseIva * this.ivaPorcentaje;
    const totalFactura = subtotal + iva - totalDev;

    this.totales = { subtotal, base0, baseIva, iva, totalDev, totalFactura };

    // Actualiza la fila fijada (pie del grid)
    this.detallePinnedBottom = [
      {
        totalLabel: 'Total Factura',
        total: totalFactura,
        valorDev: totalDev,
      },
    ];
    this.detalleApi?.setGridOption('pinnedBottomRowData', this.detallePinnedBottom);
  }

  recalcularPago() {
    this.totalPago = (this.pagoRowData || []).reduce(
      (acc, r) => acc + toNumber(r.pago),
      0
    );

    this.pagoPinnedBottom = [{ totalLabel: 'Total Pago', pago: this.totalPago }];
    this.pagoApi?.setGridOption('pinnedBottomRowData', this.pagoPinnedBottom);
  }

  // ====== Acciones ======
  nuevo() {
    // limpia cabecera
    this.numero = '';
    this.fecha = new Date().toISOString().substring(0, 10);
    this.cliente = '';
    this.factura = '';
    this.direccion = '';
    this.ruc = '';
    this.observacion = '';

    // limpia grillas
    this.detalleRowData = [{ codigo: '', descripcion: '', cantidad: 0, pvp: 0, afectaIva: true, valorDev: 0 }];
    this.pagoRowData = [{ codigo: '', descripcion: '', debe: 0, haber: 0, saldo: 0, pago: 0, cuenta: '', aplicar: false }];

    // reinicia pies
    this.detallePinnedBottom = [{ totalLabel: 'Total Factura', total: 0, valorDev: 0 }];
    this.pagoPinnedBottom = [{ totalLabel: 'Total Pago', pago: 0 }];

    // refresca grids
    this.detalleApi?.setGridOption('rowData', this.detalleRowData);
    this.detalleApi?.setGridOption('pinnedBottomRowData', this.detallePinnedBottom);

    this.pagoApi?.setGridOption('rowData', this.pagoRowData);
    this.pagoApi?.setGridOption('pinnedBottomRowData', this.pagoPinnedBottom);

    this.recalcularTotales();
    this.recalcularPago();
  }

  grabar() {
    // Aquí envías al backend tu payload consolidado
    const payload = {
      cabecera: {
        sucursal: this.sucursal,
        caja: this.caja,
        numero: this.numero,
        fecha: this.fecha,
        cliente: this.cliente,
        factura: this.factura,
        direccion: this.direccion,
        ruc: this.ruc,
        observacion: this.observacion,
      },
      detalle: this.detalleRowData,
      totales: this.totales,
      pagos: this.pagoRowData,
      totalPago: this.totalPago,
    };

    console.log('Grabar Nota de Débito →', payload);
    // TODO: llamar servicio HTTP
  }

  exportarExcel() {
    // Si tienes licencia Enterprise puedes usar export to Excel,
    // de lo contrario usamos CSV como alternativa.
    this.detalleApi?.exportDataAsCsv({ fileName: 'nota_debito_detalle.csv' });
    this.pagoApi?.exportDataAsCsv({ fileName: 'nota_debito_pagos.csv' });
  }
}

/* ===== Helpers y tipos ===== */

function toNumber(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function numberParser(params: any): number {
  return toNumber(params.newValue ?? params.value);
}

// Formato 1,234.56 sin símbolo, como en el mockup
function currency(params: any): string {
  const val = toNumber(params.value);
  return val.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface DetalleRow {
  codigo: string;
  descripcion: string;
  cantidad: number;
  pvp: number;
  afectaIva: boolean;
  valorDev: number;
}

export interface PagoRow {
  codigo: string;
  descripcion: string;
  debe: number;
  haber: number;
  saldo: number;
  pago: number;
  cuenta: string;
  aplicar: boolean;
}

export interface Totales {
  subtotal: number;
  base0: number;
  baseIva: number;
  iva: number;
  totalDev: number;
  totalFactura: number;
}
