import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';

import { ActivoFijoApiService, ActivoFijoDto } from 'src/app/services/activos-fijos.service';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

@Component({
  selector: 'app-activos-fijos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,

    AgGridAngular
  ],
  templateUrl: './activos-fijos-list.component.html',
  styleUrls: ['./activos-fijos-list.component.css']
})
export class ActivosFijosListComponent implements OnInit {
  q = '';
  rowData: ActivoFijoDto[] = [];
  total = 0;

  private gridApi?: GridApi<ActivoFijoDto>;

  // ✅ columnas con acciones
  colDefs: ColDef<ActivoFijoDto>[] = [
    {
      headerName: 'Código',
      field: 'CodigoAf',
      width: 110,
      sort: 'asc',                 // opcional: arranca ordenado
      comparator: (a, b) => {
        const na = Number(a ?? 0);
        const nb = Number(b ?? 0);
        return na - nb;
      },
      valueFormatter: (p) => String(p.value ?? '')
    },
    { headerName: 'Descripción', field: 'Descripcion', width: 380 },
    { headerName: 'Cuenta', field: 'Cuenta', width: 150 },
    { headerName: 'Nombre', field: 'PlanCuentaNombre', width: 220 },
    {
      headerName: 'V.Compra',
      field: 'Valorcompra',
      width: 160,
      filter: 'agNumberColumnFilter',
      cellClass: 'ag-right-aligned-cell',
      valueFormatter: (p) => this.formatMoney(p.value)
    },
    { headerName: 'Marca', field: 'Marca', width: 160 },
    { headerName: 'Estado', field: 'MarcaDescripcion', width: 140 },

    // ✅ Fecha dd/MM/yyyy
    {
      headerName: 'F.Compra',
      field: 'Feccompra',
      width: 140,
      valueFormatter: (p) => this.formatFechaDMY(p.value),
      comparator: (a, b) => this.compareFechaISO(a, b),
      filter: 'agDateColumnFilter',
      filterParams: {
        // el filtro se basa en fecha real (ISO o Date)
        comparator: (filterLocalDateAtMidnight: Date, cellValue: any) => {
          const d = this.parseFecha(cellValue);
          if (!d) return -1;
          const cell = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const filter = new Date(
            filterLocalDateAtMidnight.getFullYear(),
            filterLocalDateAtMidnight.getMonth(),
            filterLocalDateAtMidnight.getDate()
          );
          if (cell < filter) return -1;
          if (cell > filter) return 1;
          return 0;
        }
      }
    },

    { headerName: 'Custodio', field: 'Custodio', width: 180 },
    { headerName: 'Ubicación', field: 'Ubicacion', width: 160 },
    { headerName: 'Proveedor', field: 'Proveedor', width: 160 },
    { headerName: 'Observación', field: 'Observacion', width: 160 },

    // ✅ Editar (icono)
    {
      headerName: '',
      width: 70,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.className = 'afl-icon-btn edit';
        btn.type = 'button';
        btn.title = 'Editar';
        btn.innerHTML = `<span class="material-icons">edit</span>`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = params.data?.CodigoAf;
          if (id != null) this.editar(Number(id));
        });
        return btn;
      }
    },

    // ✅ Eliminar (icono)
    {
      headerName: '',
      width: 70,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.className = 'afl-icon-btn delete';
        btn.type = 'button';
        btn.title = 'Eliminar';
        btn.innerHTML = `<span class="material-icons">delete</span>`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = params.data?.CodigoAf;
          if (id != null) this.confirmarEliminar(Number(id));
        });
        return btn;
      }
    }
  ];

  gridOptions: GridOptions<ActivoFijoDto> = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    rowSelection: 'single',
    animateRows: true,
    rowHeight: 44,
    headerHeight: 38
  };

  constructor(
    private api: ActivoFijoApiService,
    private router: Router,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.cargar();
  }

  onGridReady(event: GridReadyEvent<ActivoFijoDto>) {
    this.gridApi = event.api;
    // opcional: ajusta columnas al tamaño
    // this.gridApi.sizeColumnsToFit();
  }

  cargar(): void {
    this.api.getAll().subscribe({
      next: (r: ActivoFijoDto[]) => {
        this.rowData = r ?? [];
        this.total = this.rowData.length;
      },
      error: (err: unknown) => {
        console.error('Error cargando activos fijos', err);
        this.rowData = [];
        this.total = 0;
      }
    });
  }

  buscar(): void {
    const q = (this.q ?? '').trim().toLowerCase();
    if (!q) {
      this.cargar();
      return;
    }

    this.api.getAll().subscribe({
      next: (r: ActivoFijoDto[]) => {
        const all = r ?? [];
        this.rowData = all.filter(x =>
          String(x.CodigoAf ?? '').toLowerCase().includes(q) ||
          String(x.Codigobarra ?? '').toLowerCase().includes(q) ||
          String(x.Descripcion ?? '').toLowerCase().includes(q) ||
          String(x.Custodio ?? '').toLowerCase().includes(q) ||
          String(x.Ubicacion ?? '').toLowerCase().includes(q)
        );
        this.total = this.rowData.length;
      },
      error: (err: unknown) => console.error('Error buscando activos fijos', err)
    });
  }

  nuevo(): void {
    this.router.navigate(['/cg-3000/activo-fijo/nuevo']);
  }

  editar(id: number): void {
    this.router.navigate(['/cg-3000/activo-fijo/editar', id]);
  }

  exportarExcel(): void {
    if (!this.gridApi) return;

    const fechaHora = this.hoyYMD();
    const datos: any[] = [];

    // ✅ Recorrer TODAS las filas cargadas en el grid (ignora paginación)
    this.gridApi.forEachNode((node) => {
      const row = node.data;
      if (!row) return;

      datos.push({
        Codigo: row.CodigoAf ?? '',
        Descripcion: row.Descripcion ?? '',
        Cuenta: row.Cuenta ?? '',
        Nombre: row.PlanCuentaNombre ?? '',
        Marca: row.Marca ?? '',
        V_Compra:row.Valorcompra ??'',
        Estado: row.MarcaDescripcion ?? '',
        F_Compra: this.formatFechaDMY(row.Feccompra),
        Custodio: row.Custodio ?? '',
        Ubicacion: row.Ubicacion ?? '',
        Proveedor: row.Proveedor ?? '',
        Observacion:row.Observacion ?? ''
      });
    });

    if (datos.length === 0) return;

    const sheetName = 'Activos Fijos';
    const keys = Object.keys(datos[0]);
    const titulo = `REPORTE DE ACTIVOS FIJOS (${datos.length})`;

    // ====== Construcción con título ======
    const aoa: any[][] = [];
    aoa.push([titulo]);
    aoa.push([]);
    aoa.push(keys);
    for (const r of datos) aoa.push(keys.map(k => r[k]));

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(aoa);

    // Merge título A1..última columna
    worksheet['!merges'] = worksheet['!merges'] || [];
    worksheet['!merges'].push({
      s: { r: 0, c: 0 },
      e: { r: 0, c: keys.length - 1 }
    });

    // Auto ancho básico
    worksheet['!cols'] = keys.map(k => {
      const maxLen = Math.max(
        k.length,
        ...datos.map(r => String(r[k] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });

    const workbook: XLSX.WorkBook = {
      Sheets: { [sheetName]: worksheet },
      SheetNames: [sheetName]
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const blob: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(blob, `ActivosFijos_${fechaHora}.xlsx`);
  }


  private confirmarEliminar(id: number): void {
    this.dialog.open(CustomMessageBoxComponent, {
      width: '420px',
      data: {
        title: 'Confirmación',
        message: `¿Está seguro de eliminar el activo fijo #${id}?`,
        type: 'warning',
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        showCancel: true
      }
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.eliminar(id);
    });
  }

private eliminar(id: number): void {
  this.api.delete(id).subscribe({
    next: () => {
      this.cargar();
    },
    error: (err: any) => {
      console.error('Error eliminando activo fijo', err);

      const msg =
        err?.message ||
        err?.error?.message ||
        err?.error ||
        'No se pudo eliminar el activo fijo.';

      this.dialog.open(CustomMessageBoxComponent, {
        width: '460px',
        data: {
          title: 'No se pudo eliminar',
          message: msg,
          type: 'error',
          confirmText: 'Entendido',
          showCancel: false
        }
      });
    }
  });
}
  // ==========================
  // Helpers FECHA dd/MM/yyyy
  // ==========================
  private parseFecha(value: any): Date | null {
    if (!value) return null;

    // DateOnly suele venir como "YYYY-MM-DD"
    if (typeof value === 'string') {
      const s = value.trim();
      // si viene "YYYY-MM-DD"
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      // si viene ISO datetime
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? null : dt;
    }

    if (value instanceof Date) return value;

    return null;
  }

  private formatFechaDMY(value: any): string {
    const d = this.parseFecha(value);
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private compareFechaISO(a: any, b: any): number {
    const da = this.parseFecha(a);
    const db = this.parseFecha(b);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return ta - tb;
  }

  private hoyYMD(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }
  irReporteDepreciacion(): void {
    // ✅ ruta del reporte (ajústala si tu ruta es otra)/cg-3000/activo-fijo/depreciacion-mensual
    //this.router.navigateByUrl('/cg-3000/activo-fijo/reporte-depreciacion/reporte-depreciacion');
    this.router.navigate(['/cg-3000/activo-fijo/depre']);

  }
  private formatMoney(v: any): string {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return '0.00';
    // punto decimal y 2 decimales
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  }
}
