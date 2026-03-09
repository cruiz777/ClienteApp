import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';

import { CuentaCobrarService } from 'src/app/services/cuenta-cobrar.service';
import { EmpresaService } from 'src/app/services/empresa.service';
import { ExportService } from 'src/app/services/export.service';
import { LogoService } from 'src/app/services/logo.service';

import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PagoReportService } from 'src/app/services/pago-report.service';

/** Fila renderizable en la grilla */
export interface PagoRow {
  numeroPago: string;
  fecha: Date;
  cliente: string;
  caja: string | null;
  pagado: number;
  total: number;
  numeroDocumento: string;
  estado: string;          // “ACTIVO” | “ANULADO”
  motivo: string | null;   // motivo de anulación (si aplica)
}

@Component({
  selector: 'app-lis-pag-todos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, AgGridAngular,
    MatMenuModule, MatButtonModule, MatIconModule, MatTooltipModule
  ],
  templateUrl: './lis-pag-anulados.component.html',
  styleUrls: ['./lis-pag-anulados.component.css']
})
export class LisPagAnuladosComponent implements OnInit {
  private fb = inject(FormBuilder);

  constructor(
    private cxc: CuentaCobrarService,
    private empresaService: EmpresaService,
    private exportService: ExportService,
    private logoService: LogoService,
    private pagoReportService: PagoReportService 
  ) {}

  @ViewChild(AgGridAngular) grid!: AgGridAngular;

  f = this.fb.group({
    numeroPago: [''],
    desde: [this.todayForDateInput(), Validators.required],
    hasta: [this.todayForDateInput(), Validators.required],
    estado: ['TODOS' as 'TODOS' | 'ACTIVO' | 'ANULADO'],
    clienteCodigo: [null as number | null]
  });

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    suppressHeaderMenuButton: true,
    wrapText: true
  };

  logoUrl: string = '';

  columnDefs: ColDef[] = [
    { headerName: 'Nro. Pago', field: 'numeroPago', width: 130 },
    {
      headerName: 'Fecha',
      field: 'fecha',
      width: 110,
      valueFormatter: p => this.formatDate(p.value)
    },
    { headerName: 'Cliente', field: 'cliente', minWidth: 220, flex: 1 },
    { headerName: 'Caja', field: 'caja', width: 90 },
    {
      headerName: 'Pagado',
      field: 'pagado',
      width: 110,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: p => this.formatMoney(p.value)
    },
    {
      headerName: 'Total',
      field: 'total',
      width: 110,
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: p => this.formatMoney(p.value)
    },
    { headerName: 'Nro. Documento', field: 'numeroDocumento', width: 160 },
    {
      headerName: 'Estado / Motivo',
      field: 'estado',
      minWidth: 260,
      flex: 1.2,
      wrapText: true,
      autoHeight: true,
      cellClass: 'cell-wrap',
      valueGetter: params => {
        const e = params.data?.estado || '';
        const m = params.data?.motivo;
        return m ? `${e} — ${m}` : e;
      }
    },
    {
      headerName: 'Acciones',
      field: 'acciones',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.height = '100%';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.border = 'none';
        btn.style.background = 'transparent';
        btn.style.cursor = 'pointer';
        btn.style.padding = '4px';
        btn.title = 'Imprimir Ingreso de Caja';

        const img = document.createElement('img');
        img.src = 'assets/icons/icon-imprimir.png';  // ✅ CAMBIA ESTA RUTA
        img.alt = 'Imprimir';
        img.style.width = '24px';
        img.style.height = '24px';

        btn.appendChild(img);
        btn.addEventListener('click', () => {
          const numeroPago = params.data?.numeroPago;
          const esAnulado = (params.data?.estado || '').toUpperCase() === 'ANULADO';
          if (numeroPago) {
            this.imprimirPago(numeroPago, esAnulado);
          }
        });

        container.appendChild(btn);
        return container;
      }
    }
  ];
  //Método para imprimir
  imprimirPago(numeroPago: string, esAnulado: boolean): void {
    this.pagoReportService
      .generarPdfDesdeApi(numeroPago, {
        titulo: 'ASOCIACION ECUATORIANA DE CODIGO DE PRODUCTO ECOP',
        logoUrl: this.logoUrl || 'assets/logo/GS1-logo.png',
        esAnulado: esAnulado
      })
      .catch(err => {
        console.error('Error al generar PDF:', err);
        alert('Error al generar el comprobante de pago');
      });
  }
  // Datos
  pagedData: PagoRow[] = [];

  // Paginación
  pageIndex = 0; // 0-based (navegación local)
  pageSize = 20;
  pageSizeOptions = [10, 20, 50];
  pageCount = 1;
  rangeLabel = '';
  visiblePages: number[] = [];
  rowHeight = 34;
  loading = false;
  paginationPageSize = 20;
  paginationPageSizeSelector = [10, 20, 50];
  ngOnInit(): void {
    this.logo();
    this.loadPage(0);

    // Cambios de filtro => se resetea a la primera página
    this.f.valueChanges.subscribe(() => {
      this.pageIndex = 0;
    });
  }

  onGridReady(_: any) {}

  // Acciones filtros
  onBuscar(): void {
    this.pageIndex = 0;
    this.loadPage(0);
  }

  // Navegación (local cuando hay filtro por estado)
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

  /** Cargar página desde API /Pagos/todos y filtrar por estado si corresponde */
  private loadPage(index: number) {
    const raw = this.f.getRawValue();
    const numeroPago = (raw.numeroPago || '').trim();
    const desde = raw.desde || undefined;
    const hasta = raw.hasta || undefined;
    const estado = (raw.estado || 'TODOS') as 'TODOS' | 'ACTIVO' | 'ANULADO';
    const clienteCodigo = raw.clienteCodigo ?? undefined;

    const estadoBackend = estado === 'ACTIVO' ? 'activos'
                       : estado === 'ANULADO' ? 'anulados'
                       : 'todos';

    this.loading = true;

    this.cxc.getPagosTodos({
      incluirDetalle: false,
      numeroPago: numeroPago || undefined,
      fechaDesde: desde,
      fechaHasta: hasta,
      clienteCodigo,
      estado: estadoBackend, 
      page: index + 1,       // API: 1-based
      pageSize: 9999 
    }).subscribe({
      next: (page) => {
        // 1) Items recibidos del backend
        let items = page.items || [];

        // 2) Filtrado por estado (client-side)
        const estadoFiltro = estado.toUpperCase();
        if (estadoFiltro !== 'TODOS') {
          items = items.filter(x => (x.estado || (x.pagoAnulado ? 'ANULADO' : 'ACTIVO')).toUpperCase() === estadoFiltro);
        }

        // 3) Si hubo filtrado, paginamos localmente
        const total = (page as any).totalItems ?? items.length;
        this.pageSize = page.pageSize ?? this.pageSize;

        // Ajusta pageIndex según la navegación pedida
        this.pageIndex = Math.max(0, index);

        // Cálculo de páginas y corte local
        this.pageCount = (page as any).totalPages ?? Math.max(1, Math.ceil(total / this.pageSize));
        const start = this.pageIndex * this.pageSize;
        const end = start + this.pageSize;
        this.pagedData = items.map(i => this.mapRow(i as any));

        // Etiqueta de rango
        const dispStart = total > 0 ? start + 1 : 0;
        const dispEnd = Math.min(total, start + items.length);
        this.rangeLabel = total > 0 ? `${dispStart} a ${dispEnd} de ${total} entradas` : '0 a 0 de 0 entradas';

        // Páginas visibles
        const windowSize = 5;
        let first = Math.max(1, (this.pageIndex + 1) - Math.floor(windowSize / 2));
        let last  = Math.min(this.pageCount, first + windowSize - 1);
        first = Math.max(1, last - windowSize + 1);
        this.visiblePages = Array.from({ length: last - first + 1 }, (_, k) => first + k);
      },
      error: (e) => {
        console.error('[LisPagTodos] loadPage error:', e);
        this.pagedData = [];
        this.pageIndex = 0;
        this.pageCount = 1;
        this.rangeLabel = '0 a 0 de 0 entradas';
        this.visiblePages = [1];
      },
      complete: () => this.loading = false
    });
  }

  // Mapear DTO normalizado -> fila de grid
  private mapRow(i: import('src/app/services/cuenta-cobrar.service').PagoItem): PagoRow {
    return {
      numeroPago: i.numeroPago,
      fecha: new Date(i.fecha),
      cliente: i.clienteNombre,
      caja: i.caja,
      pagado: i.pagado,
      total: i.totalPago,
      numeroDocumento: i.numeroDocumento,
      estado: (i.estado || (i.pagoAnulado ? 'ANULADO' : 'ACTIVO')).toUpperCase(),
      motivo: i.motivoAnulacion ?? null
    };
  }

  // Altura dinámica si texto es largo
  getRowHeight = (params: any) => {
    const txt: string = params?.data?.estado ?? '';
    if (txt.length > 160) return 64;
    if (txt.length > 80)  return 48;
    return this.rowHeight;
  };

  // Helpers
  private formatMoney(v: number) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 2 
  }).format(v ?? 0);
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

  // Exportar (usa la página mostrada)
  exportar(tipo: 'excel' | 'pdf'): void {
    const headers = [
      'Nro. Pago', 'Fecha', 'Cliente', 'Pagado', 'Total',
      'Nro. Documento', 'Estado/Motivo'
    ];
    const columns = [
      'numeroPago', 'fecha', 'cliente', 'pagado', 'total',
      'numeroDocumento', 'estado'
    ];

    const data = this.pagedData.map((item: PagoRow) => ({
      numeroPago: item.numeroPago,
      fecha: item.fecha
        ? new Date(item.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '',
      cliente: item.cliente,
      pagado: this.formatMoney(item.pagado),
      total: this.formatMoney(item.total),
      numeroDocumento: item.numeroDocumento,
      estado: item.motivo ? `${item.estado} — ${item.motivo}` : item.estado
    }));

    const options = {
      data,
      columns,
      headers,
      filename: 'Pagos',
      title: 'Listado de Pagos (Activos y Anulados)',
      logoUrl: this.logoUrl
    };

    if (tipo === 'excel') this.exportService.exportarExcel(options);
    else this.exportService.exportarPDF(options);
  }

  // Logo
  logo(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        if (empresas?.length && empresas[0].empresaLogo) {
          this.logoUrl = this.logoService.getLogoUrl(empresas[0].empresaLogo);
        }
      },
      error: (err) => console.error('Error al cargar empresa para obtener logo:', err)
    });
  }
}
