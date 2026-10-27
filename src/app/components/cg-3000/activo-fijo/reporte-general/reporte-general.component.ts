import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';

import {
  AfResumenContableDetalleService,
  AfResumenContableDetalleRow,
  ApiResponse
} from 'src/app/services/af-resumen-contable-detalle.service';

import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-reporte-general',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDialogModule,
    AgGridModule
  ],
  templateUrl: './reporte-general.component.html',
  styleUrls: ['./reporte-general.component.css']
})
export class ReporteGeneralComponent implements OnInit {
  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1;

  categoria = '';
  q = '';
  loading = false;

  rowData: AfResumenContableDetalleRow[] = [];
  totalFilas = 0;

  private gridApi?: GridApi<AfResumenContableDetalleRow>;

  // ✅ NOMBRES "QUEMADOS" (por IdPlanCuentas)
  private readonly NOMBRE_PLAN: Record<number, string> = {
    60: 'EDIFICIOS (ACTIVO)',
    73: 'DEPRECIACION EDIFICIOS',

    62: 'EQUIPOS DE OFICINA (ACTIVO)',
    70: 'DEPRECIACION EQUIPOS DE OFICINA',

    66: 'EQUIPOS DE COMPUTACION (ACTIVO)',
    72: 'DEPRECIACION EQUIPOS DE COMPUTACION',

    64: 'MUEBLES Y ENSERES (ACTIVO)',
    71: 'DEPRECIACION MUEBLES Y ENSERES'
  };

  private getNombreCuenta(idPlan: number | null | undefined, esSaldo?: boolean): string {
    if (esSaldo) return 'SALDO';
    if (idPlan == null) return '';
    return this.NOMBRE_PLAN[idPlan] ?? `PLAN ${idPlan}`;
  }

  // ✅ "Pseudo-group" (sin enterprise): solo muestra categoría en 1ra fila del bloque
  private getCategoriaDisplay(p: any): string {
    const d = p.data as AfResumenContableDetalleRow | undefined;
    if (!d) return '';

    // no mostrar categoría en fila SALDO
    if (d.esSaldo) return '';

    const idx = p.node?.rowIndex;
    if (idx == null || idx === 0) return d.categoria ?? '';

    const prevNode = p.api.getDisplayedRowAtIndex(idx - 1);
    const prev = prevNode?.data as AfResumenContableDetalleRow | undefined;

    if (prev?.categoria === d.categoria) return '';
    return d.categoria ?? '';
  }

  colDefs: ColDef<AfResumenContableDetalleRow>[] = [
    {
      headerName: 'Categoria',
      width: 190,
      sortable: false,
      filter: true,
      valueGetter: (p) => this.getCategoriaDisplay(p)
    },
    {
      headerName: 'Año',
      field: 'anio',
      width: 90,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p) => (p.value == null ? '' : String(p.value))
    },
    {
      headerName: 'Fecha',
      field: 'fecha',
      width: 130,
      comparator: (a, b) => this.compareFechaDMY(a, b),
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'Cuenta',
      field: 'asiento',
      width: 140
    },
    {
      headerName: 'Nombre Cuenta',
      width: 320,
      valueGetter: (p) => this.getNombreCuenta(p.data?.idPlanCuentas ?? null, p.data?.esSaldo),
      tooltipValueGetter: (p) => this.getNombreCuenta(p.data?.idPlanCuentas ?? null, p.data?.esSaldo)
    },
    {
      headerName: 'Debe',
      field: 'debe',
      width: 140,
      filter: 'agNumberColumnFilter',
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (p) => this.formatMoney(p.value)
    },
    {
      headerName: 'Haber',
      field: 'haber',
      width: 140,
      filter: 'agNumberColumnFilter',
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (p) => this.formatMoney(p.value)
    },
    { headerName: 'Comentario', field: 'comentario', flex: 1, minWidth: 260 }
  ];

  gridOptions: GridOptions<AfResumenContableDetalleRow> = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    animateRows: true,
    rowHeight: 42,
    headerHeight: 38,
    getRowClass: (p) => (p.data?.esSaldo ? 'row-saldo' : '')
  };

  constructor(
    private srv: AfResumenContableDetalleService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.consultar();
  }

  onGridReady(e: GridReadyEvent<AfResumenContableDetalleRow>) {
    this.gridApi = e.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
  }

  consultar(): void {
    if (!this.anio || !this.mes) return;

    this.loading = true;

    const cat = (this.categoria ?? '').trim();
    const categoriaParam = cat === '' ? null : cat;

    this.srv.getDetalle(this.anio, this.mes, categoriaParam).subscribe({
      next: (resp: ApiResponse<AfResumenContableDetalleRow[]>) => {
        this.loading = false;

        if ((resp.type || '').toUpperCase() === 'ERROR') {
          this.rowData = [];
          this.totalFilas = 0;
          this.setPinnedTotals([]);
          this.msg('Error', resp.message || 'No se pudo consultar.', 'error');
          return;
        }

        const rows = resp.data ?? [];

        // ✅ orden para que "pseudo-group" funcione perfecto
        rows.sort((a, b) => {
          const ca = (a.categoria || '').localeCompare(b.categoria || '');
          if (ca !== 0) return ca;

          const sa = a.esSaldo ? 1 : 0;
          const sb = b.esSaldo ? 1 : 0;
          if (sa !== sb) return sa - sb;

          return this.compareFechaDMY(a.fecha, b.fecha);
        });

        this.rowData = rows;
        this.totalFilas = rows.length;

        this.setPinnedTotals(rows);
        this.applyQuickFilter((this.q ?? '').trim());

        setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
      },
      error: (err) => {
        this.loading = false;
        this.rowData = [];
        this.totalFilas = 0;
        this.setPinnedTotals([]);
        console.error(err);
        this.msg('Error', 'No se pudo consultar el reporte.', 'error');
      }
    });
  }

  limpiar(): void {
    this.categoria = '';
    this.q = '';
    this.consultar();
  }

  onQuickFilterChange(): void {
    this.applyQuickFilter((this.q ?? '').trim());
  }

  exportarExcel(): void {
    if (!this.gridApi) return;

    const fechaHora = this.hoyYMD();
    const datos: any[] = [];

    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      const r = node.data;
      if (!r) return;

      datos.push({
        Categoria: r.categoria ?? '',
        Anio: r.anio ?? '',
        Fecha: r.fecha ?? '',
        Cuenta: r.asiento ?? '',
        NombreCuenta: this.getNombreCuenta(r.idPlanCuentas ?? null, r.esSaldo),
        Debe: r.debe ?? 0,
        Haber: r.haber ?? 0,
          Comentario: r.comentario ?? ''
      });
    });

    if (datos.length === 0) return;

    const sheetName = 'Resumen Contable Detalle';
    const keys = Object.keys(datos[0]);
    const titulo = `RESUMEN CONTABLE DETALLE (${this.mesLabel(this.mes)}/${this.anio})`;

    const aoa: any[][] = [];
    aoa.push([titulo]);
    aoa.push([]);
    aoa.push(keys);
    for (const r of datos) aoa.push(keys.map(k => r[k]));

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(aoa);

    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: keys.length - 1 } });

    ws['!cols'] = keys.map(k => {
      const maxLen = Math.max(k.length, ...datos.map(r => String(r[k] ?? '').length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 70) };
    });

    const wb: XLSX.WorkBook = { Sheets: { [sheetName]: ws }, SheetNames: [sheetName] };

    const buffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(blob, `ResumenContableDetalle_${fechaHora}.xlsx`);
  }

  // ======== compat quick filter / pinned ========
  private applyQuickFilter(text: string): void {
    const api: any = this.gridApi;
    if (!api) return;
    if (typeof api.setGridOption === 'function') api.setGridOption('quickFilterText', text);
    else if (typeof api.setQuickFilter === 'function') api.setQuickFilter(text);
  }

  private setPinnedBottom(rows: any[]): void {
    const api: any = this.gridApi;
    if (!api) return;
    if (typeof api.setGridOption === 'function') api.setGridOption('pinnedBottomRowData', rows);
    else if (typeof api.setPinnedBottomRowData === 'function') api.setPinnedBottomRowData(rows);
  }

  private setPinnedTotals(rows: AfResumenContableDetalleRow[]): void {
    const base = (rows ?? []).filter(x => !x.esSaldo);
    const sumDebe = base.reduce((acc, x) => acc + Number(x.debe ?? 0), 0);
    const sumHaber = base.reduce((acc, x) => acc + Number(x.haber ?? 0), 0);
    const neto = sumDebe - sumHaber;

    this.setPinnedBottom([
      {
        categoria: 'TOTAL GENERAL',
        anio: null,
        fecha: null,
        idPlanCuentas: null,
        asiento: 'TOTAL GENERAL',
        debe: 0,
        haber: Number(neto.toFixed(2)),
        comentario: 'TOTAL GENERAL (Debe - Haber)',
        esSaldo: true
      }
    ]);
  }

  // ======== helpers fecha / formatos ========
  private parseDMY(s: any): Date | null {
    if (!s || typeof s !== 'string') return null;
    const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }

  private compareFechaDMY(a: any, b: any): number {
    const da = this.parseDMY(a);
    const db = this.parseDMY(b);
    return (da?.getTime() ?? 0) - (db?.getTime() ?? 0);
  }

  private formatMoney(v: any): string {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return '0.00';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  private hoyYMD(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  mesLabel(m: number): string {
    const meses = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    return meses[(m ?? 1) - 1] ?? '01';
  }

  private msg(title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'info') {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '480px',
      data: { title, message, type, confirmText: 'Entendido', showCancel: false }
    });
  }
}