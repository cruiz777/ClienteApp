import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { FacturacionService, FacturaAnuladaListResponse } from 'src/app/services/facturacion.service';
import {  FormGroup, Validators } from '@angular/forms';
import { EmpresaService } from 'src/app/services/empresa.service';
import { MatMenuModule } from '@angular/material/menu';
import { ExportOptions } from 'src/app/interfaces/export-options';
import { ExportService } from 'src/app/services/export.service';   // <-- agrega
import { LogoService } from 'src/app/services/logo.service';   
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
export interface FacturaAnulada {
  tipo: 'Factura';
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
  imports: [CommonModule, ReactiveFormsModule, AgGridAngular,MatMenuModule,
    MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule
  ],
  templateUrl: './lis-fac-anuladas.component.html',
  styleUrls: ['./lis-fac-anuladas.component.css']
})
export class LisFacAnuladasComponent implements OnInit {
  

  private fb = inject(FormBuilder);

 
  constructor(private factService: FacturacionService,
     private empresaService: EmpresaService,
     private exportService: ExportService,   // <-- agrega
  private logoService: LogoService   
  ) {}

  @ViewChild(AgGridAngular) grid!: AgGridAngular;

  f = this.fb.group({
    cliente: [''],
 desde: [this.todayForDateInput(), Validators.required],
    hasta: [this.todayForDateInput(), Validators.required],
  });

  // Columnas
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: false,
    suppressHeaderMenuButton: true,
    wrapText: true
  };
logoUrl: string = '';
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
      headerName: 'Estado / Observación',
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

  // Datos mostrados
  pagedData: FacturaAnulada[] = [];

  // Paginación (server-side)
  pageIndex = 0; // 0-based en UI
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];
  pageCount = 1;
  rangeLabel = '';
  visiblePages: number[] = [];
  rowHeight = 34;
  private lastTotalItems = 0;

ngOnInit(): void {
  this.loadPage(0);

  this.f.valueChanges.subscribe(() => {
    // solo resetea page; no llama a la API hasta darle “Buscar”
    this.pageIndex = 0;
  });
}


  onGridReady(_: any) {}

  // Filtros
  onBuscar(): void {
    this.pageIndex = 0;
    this.loadPage(0);
  }

  // Navegación
  changePageSize(size: number) {
    this.pageSize = Number(size);
    this.pageIndex = 0;
    this.loadPage(0);
  }
  goTo(i: number)     { this.loadPage(i); }
  next()              { if (this.pageIndex + 1 < this.pageCount) this.loadPage(this.pageIndex + 1); }
  prev()              { if (this.pageIndex > 0) this.loadPage(this.pageIndex - 1); }
  goToFirst()         { this.loadPage(0); }
  goToLast()          { this.loadPage(this.pageCount - 1); }

  // Carga una página desde API
loading = false;

private loadPage(index: number) {
  const { cliente, desde, hasta } = this.f.value;

  this.loading = true;

  this.factService.getFacturasAnuladas({
    clienteLike: cliente ?? '',
    fechaInicio: desde,
    fechaFin:    hasta,
    page:        index + 1,     // API: 1-based
    pageSize:    this.pageSize
  }).subscribe({
    next: (resp) => {
      const page = resp.data;

      // actualizar paginación
      this.pageIndex = Math.max(0, (page.page ?? 1) - 1);
      this.pageSize  = page.pageSize ?? this.pageSize;
      const total    = page.totalItems ?? 0;
      this.pageCount = Math.max(1, page.totalPages ?? Math.ceil(total / this.pageSize));

      // asignar filas al grid
      this.pagedData = (page.items ?? []).map(i => this.mapRow(i));

      // etiqueta “1 a N de T”
      const start = (this.pageIndex * this.pageSize) + 1;
      const end   = Math.min(total, start + this.pageSize - 1);
      this.rangeLabel = total > 0 ? `${start} a ${end} de ${total} entradas` : '0 a 0 de 0 entradas';

      // páginas visibles
      const windowSize = 5;
      let first = Math.max(1, (this.pageIndex + 1) - Math.floor(windowSize / 2));
      let last  = Math.min(this.pageCount, first + windowSize - 1);
      first = Math.max(1, last - windowSize + 1);
      this.visiblePages = Array.from({ length: last - first + 1 }, (_, k) => first + k);
    },
    error: (e) => {
      console.error('[LisFacAnuladas] loadPage error:', e);
      this.pagedData = [];
      this.pageIndex = 0;
      this.pageCount = 1;
      this.rangeLabel = '0 a 0 de 0 entradas';
      this.visiblePages = [1];
    },
    complete: () => this.loading = false
  });
}

  // Mapeo del DTO -> fila del grid
  private mapRow(i: FacturaAnuladaListResponse): FacturaAnulada {
    const { estb, pto, sec } = this.splitNumero(i.numeroFactura);
    return {
      tipo: 'Factura',
      fechaEmision: new Date(i.fecha),
      estb,
      puntoEmision: pto,
      secuencial: sec,
      razonSocial: i.cliente,
      total: i.total,
      estado: (i.observacion?.trim() || i.estado || '').trim(),
      ruc: i.rucCliente,
      claveAcceso: i.claveAcceso ?? ''
    };
  }

  private splitNumero(num: string) {
    const s = (num || '').padStart(15, '0'); // 3-3-9
    return { estb: s.substring(0, 3), pto: s.substring(3, 6), sec: s.substring(6) };
  }

  // Altura dinámica si la observación es larga
  getRowHeight = (params: any) => {
    const estado: string = params?.data?.estado ?? '';
    if (estado.length > 160) return 64;
    if (estado.length > 80)  return 48;
    return this.rowHeight;
  };

  // Helpers de formato
  private formatMoney(v: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v ?? 0);
  }
  private formatDate(v: any) {
    const d = new Date(v); if (isNaN(+d)) return '';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  private todayForDateInput(d: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day}`;
  }
exportar(tipo: 'excel' | 'pdf'): void {
  const headers = [
    'Tipo', 'F. Emisión', 'Estb', 'P. Emisión', 'Secuencial',
    'Razón Social', 'Total', 'Estado/Obs.', 'RUC', 'Clave de Acceso'
  ];
  const columns = [
    'tipo', 'fechaEmision', 'estb', 'puntoEmision', 'secuencial',
    'razonSocial', 'total', 'estado', 'ruc', 'claveAcceso'
  ];

  // Exporta la página actual (pagedData). Si quieres "todo", avísame y lo pido al backend sin paginar.
  const data = this.pagedData.map((item: FacturaAnulada) => ({
    tipo: item.tipo,
    fechaEmision: item.fechaEmision
      ? new Date(item.fechaEmision).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '',
    estb: item.estb,
    puntoEmision: item.puntoEmision,
    secuencial: item.secuencial,
    razonSocial: item.razonSocial,
    total: typeof item.total === 'number'
      ? new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(item.total)
      : item.total,
    estado: item.estado,
    ruc: item.ruc,
    claveAcceso: item.claveAcceso
  }));

  const options: ExportOptions = {
    data,
    columns,
    headers,
    filename: 'FacturasAnuladas',
    title: 'Listado de Facturas Anuladas',
    logoUrl: this.logoUrl
  };

  if (tipo === 'excel') {
    this.exportService.exportarExcel(options);
  } else {
    this.exportService.exportarPDF(options);
  }
}

logo(): void {
  this.empresaService.getEmpresas().subscribe({
    next: (empresas) => {
      if (empresas?.length && empresas[0].empresaLogo) {
        this.logoUrl = this.logoService.getLogoUrl(empresas[0].empresaLogo);
      } else {
        console.warn('No se encontró empresa o logo.');
      }
    },
    error: (err) => console.error('Error al cargar empresa para obtener logo:', err)
  });
}

}
