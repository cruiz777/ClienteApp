import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';

type Detalle = {
  codigo?: string;
  descripcion?: string;
  cantidad?: number;
  pvp?: number;
  total?: number;
  conIva?: boolean;      // marca si aplica IVA
  valorDev?: number;     // valor devuelto
};

type Pago = {
  codigo?: string;
  descripcion?: string;
  debe?: number;
  haber?: number;
  saldo?: number;
  pago?: boolean;
  cuenta?: string;
};

@Component({
  selector: 'app-nota-credito',
  templateUrl: './nota-credito.component.html',
  styleUrls: ['./nota-credito.component.css'],
})
export class NotaCreditoComponent {

    encabezado = {
    sucursal: '001',
    caja: '010',
    numero: '',
    fecha: this.toISO(new Date()),
    cliente: '',
    sucursal2: '',
    caja2: '',
    factura: '',
    direccion: '',
    ruc: '',
    fechaActual: this.toISO(new Date()),
    observacion: ''
  };

  // Definiciones de columnas DETALLE
  detalleCols: ColDef<Detalle>[] = [
    { headerName: 'Código', field: 'codigo', editable: true, width: 120 },
    { headerName: 'Descripción', field: 'descripcion', editable: true, flex: 1, minWidth: 220 },
    { headerName: 'Cantidad', field: 'cantidad', editable: true, width: 110, type: 'rightAligned', valueParser: numberParser },
    { headerName: 'P.V.P.', field: 'pvp', editable: true, width: 110, type: 'rightAligned', valueParser: numberParser,
      valueFormatter: currencyEC },
    { headerName: 'Total', field: 'total', width: 120, type: 'rightAligned',
      valueGetter: params => (params.data?.cantidad ?? 0) * (params.data?.pvp ?? 0),
      valueFormatter: currencyEC },
    { headerName: 'IVA', field: 'conIva', width: 90, editable: true, cellRenderer: checkboxRenderer },
    { headerName: 'Valor Dev.', field: 'valorDev', editable: true, width: 130, type: 'rightAligned',
      valueParser: numberParser, valueFormatter: currencyEC },
  ];

  // Definiciones de columnas PAGOS
  pagoCols: ColDef<Pago>[] = [
    { headerName: 'Código', field: 'codigo', editable: true, width: 120 },
    { headerName: 'Descripción', field: 'descripcion', editable: true, flex: 1, minWidth: 180 },
    { headerName: 'Debe', field: 'debe', editable: true, width: 110, type: 'rightAligned',
      valueParser: numberParser, valueFormatter: currencyEC },
    { headerName: 'Haber', field: 'haber', editable: true, width: 110, type: 'rightAligned',
      valueParser: numberParser, valueFormatter: currencyEC },
    { headerName: 'Saldo', field: 'saldo', width: 110, type: 'rightAligned',
      valueGetter: p => (p.data?.debe ?? 0) - (p.data?.haber ?? 0),
      valueFormatter: currencyEC },
    { headerName: 'Pago', field: 'pago', width: 90, editable: true, cellRenderer: checkboxRenderer },
    { headerName: 'Cuenta Cont.', field: 'cuenta', editable: true, width: 140 },
  ];

  defaultColDef: ColDef = {
    sortable: false,
    resizable: true,
    suppressHeaderMenuButton: true
  };

  // Datos iniciales
  detalleRows: Detalle[] = [
    { codigo: '', descripcion: '', cantidad: 0, pvp: 0, conIva: true, valorDev: 0 },
  ];

  pagoRows: Pago[] = [
    { codigo: '', descripcion: '', debe: 0, haber: 0, pago: false, cuenta: '' },
  ];

  // Totales
  totales = {
    subtotal: 0,
    base0: 0,
    baseIva: 0,
    iva: 0,
    totalDev: 0,
    totalFactura: 0,
    totalPago: 0
  };

  // Eventos / acciones
  recalcular(): void {
    const IVA_RATE = 0.15; // ajusta si cambia la tarifa

    let base0 = 0, baseIva = 0, iva = 0, subtotal = 0, totalDev = 0, totalFactura = 0;

    for (const r of this.detalleRows) {
      const cantidad = asNumber(r.cantidad);
      const pvp = asNumber(r.pvp);
      const total = cantidad * pvp;
      totalFactura += total;

      if (r.conIva) {
        baseIva += total;
      } else {
        base0 += total;
      }
      subtotal += total;
      totalDev += asNumber(r.valorDev);
    }
    iva = baseIva * IVA_RATE;

    let totalPago = 0;
    for (const p of this.pagoRows) {
      totalPago += asNumber(p.haber);
    }

    this.totales = { subtotal, base0, baseIva, iva, totalDev, totalFactura, totalPago };
  }

  agregarPago(): void {
    this.pagoRows = [...this.pagoRows, { codigo: '', descripcion: '', debe: 0, haber: 0, pago: false, cuenta: '' }];
  }

  nuevo(): void {
    this.detalleRows = [{ codigo: '', descripcion: '', cantidad: 0, pvp: 0, conIva: true, valorDev: 0 }];
    this.pagoRows = [{ codigo: '', descripcion: '', debe: 0, haber: 0, pago: false, cuenta: '' }];
    this.recalcular();
  }

  grabar(): void {
    // Aquí armas tu payload para el backend (observaciones, formasPago, detalles, etc.)
    // console.log({ encabezado: this.encabezado, detalles: this.detalleRows, pagos: this.pagoRows, totales: this.totales });
    alert('Guardado simulado. Integra tu servicio HTTP aquí.');
  }

  exportar(): void {
    alert('Exportar (CSV/PDF) – implementar según tu necesidad.');
  }

  private toISO(d: Date): string {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
}

/** Helpers & renderers */
function asNumber(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function numberParser(params: any): number {
  const raw = (params.newValue ?? '').toString().replace(/[^0-9.\-]/g, '');
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}

function currencyEC(params: any): string {
  const n = asNumber(params.value);
  return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

function checkboxRenderer(params: any) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!params.value;
  input.addEventListener('change', () => {
    params.setValue(input.checked);
  });
  input.className = 'nc-checkbox';
  return input;
}
