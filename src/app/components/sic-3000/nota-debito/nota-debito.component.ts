import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ValueGetterParams,
  ISelectCellEditorParams
} from 'ag-grid-community';

@Component({
  selector: 'app-nota-debito',
  templateUrl: './nota-debito.component.html',
  styleUrls: ['./nota-debito.component.css']
})
export class NotaDebitoComponent implements OnInit {
  form!: FormGroup;

  hoy = new Date().toISOString().substring(0, 10);
  hoyLargo = new Date().toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });

  // APIs de grids
  private detalleApi!: GridApi;
  private pagoApi!: GridApi;

  // Config común de columnas
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: false,
    editable: true
  };

  // ====== DETALLE ======
  detalleColumnDefs: ColDef[] = [
    { headerName: 'Código', field: 'codigo', width: 110 },
    { headerName: 'Descripción', field: 'descripcion', flex: 1 },
    {
      headerName: 'Cantidad',
      field: 'cantidad',
      width: 110,
      type: 'rightAligned',
      valueParser: numberParser
    },
    {
      headerName: 'P.V.P.',
      field: 'pvp',
      width: 110,
      type: 'rightAligned',
      valueParser: numberParser,
      valueFormatter: currency
    },
    {
      headerName: 'Total',
      field: 'total',
      width: 120,
      type: 'rightAligned',
      editable: false,
      valueGetter: (p: ValueGetterParams) =>
        (toNumber(p.data.cantidad) * toNumber(p.data.pvp)) || 0,
      valueFormatter: currency
    },
    {
      headerName: 'Afecta IVA',
      field: 'afectaIva',
      width: 110,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Sí', 'No'] } as ISelectCellEditorParams,
      valueSetter: (p) => ((p.data.afectaIva = p.newValue === 'Sí' || p.newValue === true), true),
      valueGetter: (p) => (p.data.afectaIva ? 'Sí' : 'No')
    },
    {
      headerName: 'Valor Dev.',
      field: 'valorDev',
      width: 120,
      type: 'rightAligned',
      valueParser: numberParser,
      valueFormatter: currency
    }
  ];

  detalleRowData = [
    { codigo: '', descripcion: '', cantidad: 0, pvp: 0, afectaIva: true, valorDev: 0 }
  ];

  // ====== PAGOS ======
  pagoColumnDefs: ColDef[] = [
    { headerName: 'Código', field: 'codigo', width: 110 },
    { headerName: 'Descripción', field: 'descripcion', flex: 1 },
    {
      headerName: 'Debe',
      field: 'debe',
      width: 110,
      type: 'rightAligned',
      valueParser: numberParser,
      valueFormatter: currency
    },
    {
      headerName: 'Haber',
      field: 'haber',
      width: 110,
      type: 'rightAligned',
      valueParser: numberParser,
      valueFormatter: currency
    },
    {
      headerName: 'Saldo',
      field: 'saldo',
      width: 110,
      type: 'rightAligned',
      valueParser: numberParser,
      valueFormatter: currency
    },
    {
      headerName: 'Pago',
      field: 'pago',
      width: 110,
      type: 'rightAligned',
      valueParser: numberParser,
      valueFormatter: currency
    },
    { headerName: 'Cuenta Cont.', field: 'cuenta', width: 140 },
    {
      headerName: 'Aplicar',
      field: 'aplicar',
      width: 100,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Sí', 'No'] } as ISelectCellEditorParams,
      valueSetter: (p) => ((p.data.aplicar = p.newValue === 'Sí' || p.newValue === true), true),
      valueGetter: (p) => (p.data.aplicar ? 'Sí' : 'No')
    }
  ];

  pagoRowData = [
    {
      codigo: '1',
      descripcion: 'Efectivo',
      debe: 0,
      haber: 0,
      saldo: 0,
      pago: 0,
      cuenta: '',
      aplicar: true
    }
  ];

  // Totales (totalFactura es el neto: Subtotal + IVA − TotalDev)
  totales = {
    subtotal: 0,
    base0: 0,
    baseIva: 0,
    iva: 0,
    totalDev: 0,
    totalFactura: 0
  };

  totalPago = 0;
  ivaPorcentaje = 0.15; // Ajusta al % vigente

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      sucursal: ['001'],
      caja: ['010'],
      numero: [''],
      fecha: [this.hoy],
      cliente: [''],
      sucursal2: [''],
      caja2: [''],
      factura: [''],
      direccion: [''],
      ruc: [''],
      observacion: ['']
    });

    this.recalcularTotales();
    this.recalcularPago();
  }

  // ====== gridReady ======
  onDetalleReady(e: GridReadyEvent) {
    this.detalleApi = e.api;
    this.detalleApi.sizeColumnsToFit();
  }

  onPagoReady(e: GridReadyEvent) {
    this.pagoApi = e.api;
    this.pagoApi.sizeColumnsToFit();
  }

  // ====== eventos de edición ======
  onDetalleEdited() {
    this.recalcularTotales();
  }

  // ====== Cálculos ======
  recalcularTotales() {
    let subtotal = 0,
      base0 = 0,
      baseIva = 0,
      iva = 0,
      totalDev = 0;

    (this.detalleRowData || []).forEach((r) => {
      const lineTotal = toNumber(r.cantidad) * toNumber(r.pvp);
      subtotal += lineTotal;
      if (r.afectaIva) baseIva += lineTotal;
      else base0 += lineTotal;
      totalDev += toNumber(r.valorDev);
    });

    iva = baseIva * this.ivaPorcentaje;
    const totalFactura = subtotal + iva - totalDev; // neto

    this.totales = { subtotal, base0, baseIva, iva, totalDev, totalFactura };
  }

  recalcularPago() {
    this.totalPago = (this.pagoRowData || []).reduce(
      (acc, r) => acc + toNumber(r.pago),
      0
    );
  }

  // ====== Acciones ======
  nuevo() {
    // Reset de cabecera
    this.form.reset({
      sucursal: '001',
      caja: '010',
      fecha: this.hoy
    });

    // Reset detalle/pagos
    this.detalleRowData = [
      { codigo: '', descripcion: '', cantidad: 0, pvp: 0, afectaIva: true, valorDev: 0 }
    ];
    this.pagoRowData = [
      {
        codigo: '1',
        descripcion: 'Efectivo',
        debe: 0,
        haber: 0,
        saldo: 0,
        pago: 0,
        cuenta: '',
        aplicar: true
      }
    ];

    this.recalcularTotales();
    this.recalcularPago();

    // AG Grid v31+: usa setGridOption('rowData', ...)
    if (this.detalleApi) this.detalleApi.setGridOption('rowData', this.detalleRowData);
    if (this.pagoApi) this.pagoApi.setGridOption('rowData', this.pagoRowData);
  }

  onSave() {
    // Validación de cuadratura (tolerancia de redondeo)
    const ok = nearlyEqual(this.totalPago, this.totales.totalFactura, 0.01);
    if (!ok) {
      alert(
        `El total de pago (${this.totalPago.toFixed(
          2
        )}) no coincide con el total de la nota (${this.totales.totalFactura.toFixed(
          2
        )}).`
      );
      return;
    }

    const payload = {
      cabecera: this.form.value,
      detalle: this.detalleRowData,
      pagos: this.pagoRowData,
      totales: this.totales
    };

    console.log('Guardar Nota de Débito:', payload);
    alert('Guardado (demo). Revisa la consola.');
  }

  exportar(tipo: 'xlsx' | 'csv' | 'pdf') {
    if (tipo === 'csv') {
      this.detalleApi?.exportDataAsCsv({ fileName: 'nota-debito-detalle.csv' });
      this.pagoApi?.exportDataAsCsv({ fileName: 'nota-debito-pagos.csv' });
    } else {
      alert(`Demo: exportación ${tipo} no implementada en este snippet.`);
    }
  }
}

/* ================= Helpers ================= */
function toNumber(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function numberParser(params: any) {
  // Acepta punto decimal; si el usuario escribe coma, la convierte a punto.
  const raw = String(params.newValue ?? '').trim();
  const normalized = raw.replace(',', '.');
  const n = Number(normalized);
  return isNaN(n) ? 0 : n;
}

function currency(params: any) {
  const n = toNumber(params.value);
  return n.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function nearlyEqual(a: number, b: number, epsilon = 0.005) {
  return Math.abs(a - b) <= epsilon;
}
