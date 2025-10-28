import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';

export interface FacturaAnulada {
  tipo: 'Factura' | 'Retención';
  fechaEmision: Date;
  estb: string;
  puntoEmision: string;
  secuencial: string;
  razonSocial: string;
  total: number;
  estado: string;
  ruc: string;
  claveAcceso: string;
}

@Component({
  selector: 'app-lis-fac-anuladas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AgGridAngular],
  templateUrl: './lis-fac-anuladas.component.html',
  styleUrls: ['./lis-fac-anuladas.component.css']
})
export class LisFacAnuladasComponent implements OnInit {
  private fb = inject(FormBuilder);

  @ViewChild(AgGridAngular) grid!: AgGridAngular;

  f = this.fb.group({
    cliente: [''],
    desde:   [null as string | null],
    hasta:   [null as string | null]
  });

  // Columnas AG Grid
 defaultColDef: ColDef = {
  resizable: true,
  sortable: true,
  filter: false,
  suppressHeaderMenuButton: true,
  wrapText: true
};

  columnDefs: ColDef[] = [
    { headerName: 'Tipo de Documento', field: 'tipo', width: 140 },
    {
      headerName: 'F. Emisión',
      field: 'fechaEmision',
      width: 120,
      valueFormatter: p => this.formatDate(p.value)
    },
    { headerName: 'Estb', field: 'estb', width: 70 },
    { headerName: 'P. Emisión', field: 'puntoEmision', width: 95 },
    { headerName: 'Secuencial', field: 'secuencial', width: 120 },
    { headerName: 'Razón Social', field: 'razonSocial', minWidth: 180, flex: 1 },
    {
      headerName: 'Total',
      field: 'total',
      width: 100,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: p => this.formatMoney(p.value)
    },
    {
      headerName: 'Estado',
      field: 'estado',
      minWidth: 260,
      flex: 1.2,
      wrapText: true,
      autoHeight: true,
      cellClass: 'cell-wrap'
    },
    { headerName: 'RUC', field: 'ruc', width: 140 },
    { headerName: 'Clave de Acceso', field: 'claveAcceso', width: 180 }
  ];

  // Datos
  private baseData: FacturaAnulada[] = [];   // dataset original sin filtros
  private allData: FacturaAnulada[]  = [];   // dataset filtrado/ordenado
  pagedData: FacturaAnulada[] = [];

  // Paginación externa
  pageIndex = 0; // 0-based
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];
  pageCount = 1;
  rangeLabel = '';
  visiblePages: number[] = [];
  rowHeight = 34;

  ngOnInit(): void {
    this.baseData = this.mockData(100);
    this.allData  = [...this.baseData];
    this.applyPaging();
  }

  onGridReady(_: any) { /* reservado */ }

  // --- Acciones ---
  onBuscar(): void {
    const { cliente, desde, hasta } = this.f.value;

    let filtered = [...this.baseData];

    if (cliente?.trim()) {
      const q = cliente.trim().toLowerCase();
      filtered = filtered.filter(x => x.razonSocial.toLowerCase().includes(q));
    }

    if (desde) {
      const d = new Date(desde); d.setHours(0, 0, 0, 0);
      filtered = filtered.filter(x => x.fechaEmision >= d);
    }
    if (hasta) {
      const h = new Date(hasta); h.setHours(23, 59, 59, 999);
      filtered = filtered.filter(x => x.fechaEmision <= h);
    }

    this.allData = filtered.sort((a, b) => +b.fechaEmision - +a.fechaEmision);
    this.pageIndex = 0;
    this.applyPaging();
  }

  changePageSize(size: number) {
    this.pageSize = Number(size);
    this.pageIndex = 0;
    this.applyPaging();
  }
  goTo(i: number) { this.pageIndex = i; this.applyPaging(); }
  next() { if (this.pageIndex + 1 < this.pageCount) { this.pageIndex++; this.applyPaging(); } }
  prev() { if (this.pageIndex > 0) { this.pageIndex--; this.applyPaging(); } }
  goToFirst() { this.pageIndex = 0; this.applyPaging(); }
  goToLast() { this.pageIndex = this.pageCount - 1; this.applyPaging(); }

  // --- Paginación manual sobre rowData ---
  private applyPaging() {
    const total = this.allData.length;
    this.pageCount = Math.max(1, Math.ceil(total / this.pageSize));

    const start = this.pageIndex * this.pageSize;
    const end   = Math.min(total, start + this.pageSize);

    this.pagedData = this.allData.slice(start, end);
    this.rangeLabel = `${start + 1} a ${end} de ${total} entradas`;

    const windowSize = 5;
    let first = Math.max(1, (this.pageIndex + 1) - Math.floor(windowSize / 2));
    let last  = Math.min(this.pageCount, first + windowSize - 1);
    first = Math.max(1, last - windowSize + 1);
    this.visiblePages = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }

  // Ajuste dinámico de altura para la columna “estado”
  getRowHeight = (params: any) => {
    const estado: string = params?.data?.estado ?? '';
    if (estado.length > 160) return 64;   // filas con texto muy largo
    if (estado.length > 80)  return 48;
    return this.rowHeight;                // default (34)
  };

  // --- Helpers ---
  private formatMoney(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
      .format(v ?? 0);
  }

  private formatDate(v: any) {
    const d = new Date(v); if (isNaN(+d)) return '';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private mockData(n: number): FacturaAnulada[] {
    const estados = [
      'ERROR EN DIFERENCIAS --- Inventario de errores — FactuElect total sin impuestos de la factura $45.65 no es igual a la suma de los totales sin impuestos de las líneas 19:08 — 19/05/2021 12:33:45',
      'Inventario de errores — “Impuesto Fodaflorado: La base impuesto total Factura Total (sumimpl) = 1064.90. Carga porcentaje 2% cargado 36.85 no coincide con el calculado 48.90 — 18/05/2021 12:35:48'
    ];
    const arr: FacturaAnulada[] = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        tipo: i % 2 === 0 ? 'Factura' : 'Retención',
        fechaEmision: new Date(2021, (i % 12), 1 + (i % 28)),
        estb: '001',
        puntoEmision: '010',
        secuencial: (300000 + i).toString().padStart(9, '0'),
        razonSocial: i % 2 === 0 ? 'Mora Avellan Otto Franklin' : 'RIGHTS FOODS INCLUSIVESCOMPANY CIA. LTDA.',
        total: 409.40,
        estado: estados[i % estados.length],
        ruc: i % 2 === 0 ? '1713472551001' : '1790316014001',
        claveAcceso: '020220210719' + (9000 + i)
      });
    }
    return arr;
  }
}
