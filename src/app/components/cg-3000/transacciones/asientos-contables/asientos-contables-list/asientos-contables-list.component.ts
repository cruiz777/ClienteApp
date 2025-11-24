import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, CellClickedEvent } from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';

// 🔹 Angular Material para el dropdown
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


import { AsientosContablesService } from 'src/app/services/asientos-contables.service';
import { ListadoAsientoContableResponse } from 'src/app/interfaces/responses/asientos-contables-response';

import { AsientosContablesFormComponent } from '../asientos-contables-form/asientos-contables-form.component';

// ✅ Registro de módulos (requerido en v33)
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

// tipo fuerte para el parámetro 
type TipoIdentificacion = 'CEDULA' | 'RUC' | 'PASAPORTE';

@Component({
  selector: 'app-asientos-contables-ag',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './asientos-contables-list.component.html',
  styleUrls: ['./asientos-contables-list.component.css']
})
export class AsientoContableComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  loading = false;
  error: string | null = null;

  gridOptions = {
    rowHeight: 28,      // alto de fila
    headerHeight: 35,   // alto de cabecera
  };

  rowData: ListadoAsientoContableResponse[] = [];
  /** copia completa para poder volver a filtrar */
  private rowDataOriginal: ListadoAsientoContableResponse[] = [];

  /** texto del buscador (empresa, beneficiario, etc.) */
  searchTerm = '';

  /** filtros de fecha (vienen del <input type="date"> en formato YYYY-MM-DD) */
  fechaDesde: string | null = null;
  fechaHasta: string | null = null;

  private gridApi!: GridApi<ListadoAsientoContableResponse>;

  columnDefs: ColDef<ListadoAsientoContableResponse>[] = [
    { headerName: 'Código', field: 'idCabMaestro', width: 160, sortable: true, filter: true, hide: true },
    { headerName: 'Empresa', field: 'empresa', width: 160, sortable: true, filter: true, hide: true },
    {
      headerName: 'Fecha Transacción', field: 'fechatransaccion', width: 160, sortable: true, filter: true,
      valueGetter: p => p.data?.fechatransaccion ? new Date(p.data.fechatransaccion as any) : null,
      valueFormatter: p => p.value ? formatDateYMD(p.value as Date) : ''
    },
    {
      headerName: 'Fecha Ingreso', field: 'fechaingreso', width: 160, sortable: true, filter: true,
      valueGetter: p => p.data?.fechaingreso ? new Date(p.data.fechaingreso as any) : null,
      valueFormatter: p => p.value ? formatDateYMD(p.value as Date) : ''
    },
    
    { headerName: 'Tipo Asiento', field: 'tipoAsientoCompleto', width: 100, sortable: true, filter: true },
    
    { headerName: 'No. Documento', field: 'numdoc', width: 140, sortable: true, filter: true },
    {
      headerName: 'Debe', field: 'totdebe', width: 120, sortable: true, filter: 'agNumberColumnFilter',
      editable: haberEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.debe) > 0
      }
    },
    {
      headerName: 'Haber', field: 'tothaber', width: 120, sortable: true, filter: 'agNumberColumnFilter',
      editable: haberEditable,
      type: 'rightAligned',
      valueSetter: valueSetterDot2,
      valueFormatter: twoDecimalsDotFormatter,
      suppressKeyboardEvent: blockComma,
      cellClassRules: {
        'ag-disabled': (p: any) => toNumber(p.data?.debe) > 0
      }
    },
   
    { headerName: 'Beneficiario', field: 'beneficiario', width: 260, sortable: true, filter: true },
    { headerName: 'Observación', field: 'observacion', width: 300, sortable: true, filter: true },
    {
      headerName: 'Acciones',
      colId: 'acciones',
      width: 60,
      pinned: 'right',
      suppressHeaderMenuButton: true,
      menuTabs: [],
      cellRenderer: () => `
        <button class="ag-action-btn" data-action="edit" title="Editar">
          <img src="assets/icons/icon-modificar-3.png" width="18" height="18" alt="Editar" />
        </button>
      `,
      sortable: false,
      filter: false
    }
  ];

  defaultColDef: ColDef = { resizable: true };

  constructor(
    private asientosService: AsientosContablesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
     this.setFechasMesActual(); 
    this.obtenerAsientos();
  }

  onGridReady(e: GridReadyEvent<ListadoAsientoContableResponse>): void {
    this.gridApi = e.api;
  }

  obtenerAsientos(): void {
    this.loading = true;
    this.error = null;

    this.asientosService.GetListado().subscribe({
      next: (resp: ListadoAsientoContableResponse[]) => {
        this.rowDataOriginal = resp ?? [];
        // al cargar, aplicamos filtros actuales (si hubiera)
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener asientos:', err);
        this.error = err?.message ?? 'Error al cargar';
        this.loading = false;
      }
    });
  }

  /**
   * Aplica filtro de texto + rango de fechas sobre rowDataOriginal
   * y deja el resultado en rowData (lo que ve el grid).
   */
  aplicarFiltros(): void {
    const termino = (this.searchTerm || '').toLowerCase().trim();

    const desde = this.fechaDesde ? new Date(this.fechaDesde) : null;
    const hasta = this.fechaHasta ? new Date(this.fechaHasta) : null;

    // para que la fechaHasta incluya todo el día
    let hastaFinDia: Date | null = null;
    if (hasta) {
      hastaFinDia = new Date(hasta);
      hastaFinDia.setHours(23, 59, 59, 999);
    }

    this.rowData = this.rowDataOriginal.filter(row => {
      // --- filtro de texto (empresa, beneficiario, numdoc, observación) ---
      if (termino) {
        const empresa = (row.empresa || '').toLowerCase();
        const benef = (row.beneficiario || '').toLowerCase();
        const numdoc = row.numdoc ? String(row.numdoc).toLowerCase() : '';
        const obs = (row.observacion || '').toLowerCase();

        const coincideTexto =
          empresa.includes(termino) ||
          benef.includes(termino) ||
          numdoc.includes(termino) ||
          obs.includes(termino);

        if (!coincideTexto) {
          return false;
        }
      }

      // --- filtro por FECHA TRANSACCIÓN ---
      if (!desde && !hastaFinDia) {
        // no hay filtro de fecha
        return true;
      }

      if (!row.fechatransaccion) {
        return false;
      }

      const f = new Date(row.fechatransaccion as any);
      if (isNaN(f.getTime())) {
        return false;
      }

      if (desde && f < desde) {
        return false;
      }
      if (hastaFinDia && f > hastaFinDia) {
        return false;
      }

      return true;
    });
  }

  // click en botón de acción
  onCellClicked(evt: CellClickedEvent<ListadoAsientoContableResponse>): void {
    if (evt?.colDef?.colId === 'acciones') {
      const action = (evt.event?.target as HTMLElement)?.closest('button')?.getAttribute('data-action');
      if (action === 'edit' && evt.data) {
        this.editarAsiento(evt.data);
      }
    }
  }

  nuevoAsiento(): void {
    console.log('Nuevo asiento');
  }

  editarAsiento(row: ListadoAsientoContableResponse): void {
    console.log('Editar asiento', row);
  }

  abrirCrear(): void {
    const dialogRef = this.dialog.open(AsientosContablesFormComponent, {
      width: '75vw',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'asiento-dialog',
      autoFocus: false,
      restoreFocus: false,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.obtenerAsientos();
      }
    });
  }

  abrirEditar(id: number): void {
    const dialogRef = this.dialog.open(AsientosContablesFormComponent, {
      width: '900px',
      data: { id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.obtenerAsientos();
      }
    });
  }

    private setFechasMesActual(): void {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth(); // 0 = enero

    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);

    this.fechaDesde = toInputDate(primerDia);
    this.fechaHasta = toInputDate(ultimoDia);
  }

}

/* ================== Helpers ================== */

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${day}-${m}-${y}`;
}

function numberParser(params: any): number {
  const v = (params.newValue ?? '').toString().replace(',', '.').trim();
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
function boolParser(params: any): boolean {
  const v = (params.newValue ?? '').toString().toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'sí' || v === 'si';
}
function isoParser(params: any): string {
  const v = (params.newValue ?? '').toString().trim();
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toISOString();
}
function blockComma(params: any): boolean { return params.event?.key === ','; }

const decimalDot2Regex = /^\d*(\.\d{0,2})?$/;
function valueSetterDot2(params: any): boolean {
  const raw = String(params.newValue ?? '').trim();
  if (raw.includes(',')) return false;
  if (!decimalDot2Regex.test(raw)) return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;
  // Reglas Debe/Haber: si uno > 0, el otro = 0
  const field = params.colDef.field!;
  if (field === 'debe') {
    params.data.debe = n > 0 ? Number(n.toFixed(2)) : 0;
    if (params.data.debe > 0) params.data.haber = 0;
  } else if (field === 'haber') {
    params.data.haber = n > 0 ? Number(n.toFixed(2)) : 0;
    if (params.data.haber > 0) params.data.debe = 0;
  } else {
    (params.data as any)[field] = n;
  }
  return true;
}
function twoDecimalsDotFormatter(p: any): string {
  const val = Number(p.value ?? 0);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const normalized = String(v).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

function debeEditable(params: any) {
  const h = toNumber(params.data?.haber);
  return h <= 0;
}
function haberEditable(params: any) {
  const d = toNumber(params.data?.debe);
  return d <= 0;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;   // formato para <input type="date">
}