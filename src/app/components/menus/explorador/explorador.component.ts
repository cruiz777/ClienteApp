import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClienteService } from 'src/app/services/cliente.service';
import { ExportService } from 'src/app/services/export.service';
import { PermissionsService } from 'src/app/services/permission.service';
import { ExportOptions } from 'src/app/interfaces/export-options';

interface Cliente {
  clientes_codigo: number;
  nomcli: string;
  dircli: string;
  ruc: string;
  fecing: string | Date;
  zonaReferencia: string;
  estadoNombre: string;
  prefijo: string;
  representante?: string;
  telefono?: string;
  tipoCliente?: string;
  grupoEmpresa?: string;
}

@Component({
  selector: 'app-explorador',
  templateUrl: './explorador.component.html',
  styleUrls: ['./explorador.component.css']
})
export class ExploradorComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid?: AgGridAngular;

  filtroForm!: FormGroup;

  pageSize = 10;
  totalRegistros = 0;

  clientesFiltrados: Cliente[] = [];
  rowData: Cliente[] = [];

  logoUrl: string = '';

  private gridApi?: GridApi;

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1
  };

  columnDefs: ColDef[] = [
    { headerName: 'Código', field: 'clientes_codigo', width: 100 },
    { headerName: 'Nombre', field: 'nomcli', width: 180 },
    { headerName: 'Dirección', field: 'dircli', width: 180 },
    { headerName: 'RUC', field: 'ruc', width: 120 },
    { headerName: 'T.CLIENTE', field: 'tipoCliente', width: 120 },
    { headerName: 'G.EMPRESA', field: 'grupoEmpresa', width: 120 },
    {
      headerName: 'F.Ingreso',
      field: 'fecing',
      width: 130,
      valueFormatter: params => this.formatearFecha(params.value)
    },
    { headerName: 'Zona', field: 'zonaReferencia', width: 100 },
    { headerName: 'Estado', field: 'estadoNombre', width: 100 },
    { headerName: 'Prefijo', field: 'prefijo', width: 100 },
    { headerName: 'Representante', field: 'representante', width: 140 },
    {
      headerName: 'Teléfono',
      field: 'telefono',
      width: 120,
      valueFormatter: params => (params.value ? `+593${params.value}` : '')
    }
  ];

  constructor(
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
    private clienteService: ClienteService,
    private exportService: ExportService,
    public permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.filtroForm = this.fb.group({
      busquedaGeneral: [''],
      prefijoBusqueda: ['']
    });
  }

  private getFiltros(): { busquedaGeneral: string; prefijoBusqueda: string } {
    return {
      busquedaGeneral: String(this.filtroForm.get('busquedaGeneral')?.value || '').trim(),
      prefijoBusqueda: String(this.filtroForm.get('prefijoBusqueda')?.value || '').trim()
    };
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
    this.cargarDatos(true);
  }

  cargarDatos(resetAPrimeraPagina: boolean = false): void {
    const filtros = this.getFiltros();

    this.gridApi?.showLoadingOverlay();

    this.clienteService.getClientesPaginados(1, 20000, filtros).subscribe({
      next: (res: any) => {
        this.rowData = res.data || [];
        this.totalRegistros = res.count ?? this.rowData.length;
        this.clientesFiltrados = [...this.rowData];

        if (resetAPrimeraPagina) {
          this.gridApi?.paginationGoToFirstPage();
        }

        if (!this.rowData.length) this.gridApi?.showNoRowsOverlay();
        else this.gridApi?.hideOverlay();
      },
      error: () => {
        this.rowData = [];
        this.totalRegistros = 0;
        this.clientesFiltrados = [];
        this.gridApi?.showNoRowsOverlay();
        this.mostrarAlerta('Error cargando clientes', 'Error');
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarDatos(true);
  }

  limpiarFiltros(): void {
    this.filtroForm.reset();
    this.cargarDatos(true);
  }

  // IMPORTANTE: solo una implementación (sin paginationSetPageSize)
  onPageSizeInput(val: string | number): void {
    const num = parseInt(String(val).replace(/\D/g, ''), 10);
    this.pageSize = this.clampPageSize(isNaN(num) ? 10 : num);

    // El binding [paginationPageSize]="pageSize" aplica el cambio.
    this.gridApi?.paginationGoToFirstPage();

    // Opcional (safe): algunas versiones lo tienen, otras no.
    (this.gridApi as any)?.refreshClientSideRowModel?.('paginate');
  }

  // IMPORTANTE: solo una implementación (sin paginationSetPageSize)
  normalizePageSize(): void {
    if (!this.pageSize || isNaN(Number(this.pageSize))) this.pageSize = 10;
    this.pageSize = this.clampPageSize(Number(this.pageSize));

    this.gridApi?.paginationGoToFirstPage();
    (this.gridApi as any)?.refreshClientSideRowModel?.('paginate');
  }

  onlyDigits(ev: KeyboardEvent): void {
    if (!/^\d$/.test(ev.key)) ev.preventDefault();
  }

  private clampPageSize(n: number): number {
    return Math.max(1, Math.min(1000, n));
  }

  mostrarAlerta(mensaje: string, tipo: string): void {
    this._snackBar.open(mensaje, tipo, {
      horizontalPosition: 'end',
      verticalPosition: 'top',
      duration: 3000
    });
  }

  private formatearFecha(fecha: string | Date): string {
    if (!fecha || fecha === '0001-01-01T00:00:00') return '';
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  exportar(tipo: 'excel' | 'pdf'): void {
    if (!this.agGrid?.api) return;

    const api = this.agGrid.api;

    const page = api.paginationGetCurrentPage(); // 0-based
    const pageSize = api.paginationGetPageSize();
    const start = page * pageSize;
    const end = Math.min(start + pageSize, api.getDisplayedRowCount());

    const filasPagina: any[] = [];
    for (let i = start; i < end; i++) {
      const node = api.getDisplayedRowAtIndex(i);
      if (node?.data) filasPagina.push(node.data);
    }
    if (filasPagina.length === 0) return;

    const headers = [
      'Código', 'Nombre', 'Dirección', 'RUC', 'T.CLIENTE', 'G.EMPRESA',
      'F.Ingreso', 'Zona', 'Estado', 'Prefijo', 'Representante', 'Teléfono'
    ];
    const columns = [
      'clientes_codigo', 'nomcli', 'dircli', 'ruc', 'tipoCliente', 'grupoEmpresa',
      'fecing', 'zonaReferencia', 'estadoNombre', 'prefijo', 'representante', 'telefono'
    ];

    const data = filasPagina.map(r => ({
      clientes_codigo: r.clientes_codigo ?? '',
      nomcli: r.nomcli ?? '',
      dircli: r.dircli ?? '',
      ruc: r.ruc ?? '',
      tipoCliente: r.tipoCliente ?? '',
      grupoEmpresa: r.grupoEmpresa ?? '',
      fecing: r.fecing
        ? new Date(r.fecing).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '',
      zonaReferencia: r.zonaReferencia ?? '',
      estadoNombre: r.estadoNombre ?? '',
      prefijo: r.prefijo ?? '',
      representante: r.representante ?? '',
      telefono: r.telefono ? `+593${r.telefono}` : ''
    }));

    const options: ExportOptions = {
      data,
      columns,
      headers,
      filename: 'Clientes_pagina_actual',
      title: 'Clientes – Página actual',
      logoUrl: this.logoUrl
    };

    if (tipo === 'excel') this.exportService.exportarExcel(options);
    else this.exportService.exportarPDF(options);
  }
}
