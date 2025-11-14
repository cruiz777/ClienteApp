import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, CellClickedEvent } from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';

import { AsientosContablesService } from 'src/app/services/asientos-contables.service';
import { ListadoAsientoContableResponse } from 'src/app/interfaces/responses/asientos-contables-response';

import { AsientosContablesFormComponent } from '../asientos-contables-form/asientos-contables-form.component';

// ✅ Registro de módulos (requerido en v33)
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

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
      rowHeight: 25,      // alto de fila
      headerHeight: 30,   // alto de cabecera
  };

  rowData: ListadoAsientoContableResponse[] = [];
  searchTerm = '';

  private gridApi!: GridApi<ListadoAsientoContableResponse>;

  columnDefs: ColDef<ListadoAsientoContableResponse>[] = [
    { headerName: 'Código', field: 'idCabMaestro', width: 160, sortable: true, filter: true,hide:true },
    { headerName: 'Empresa', field: 'empresa', width: 160, sortable: true, filter: true,hide:true },
    { headerName: 'Tipo Asiento', field: 'tipoAsientoCompleto', width: 200, sortable: true, filter: true },
    { headerName: 'Beneficiario', field: 'beneficiario', width: 160, sortable: true, filter: true },
    { headerName: 'No. Documento', field: 'numdoc', width: 140, sortable: true, filter: true },
    {
      headerName: 'Debe', field: 'totdebe', width: 120, sortable: true, filter: 'agNumberColumnFilter',
      //valueFormatter: p => (p.value ?? 0).toLocaleString('es-EC')
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
      //valueFormatter: p => (p.value ?? 0).toLocaleString('es-EC')
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
      headerName: 'Fecha Transacción', field: 'fechatransaccion', width: 160, sortable: true, filter: true,
      valueGetter: p => p.data?.fechatransaccion ? new Date(p.data.fechatransaccion as any) : null,
      valueFormatter: p => p.value ? formatDateYMD(p.value as Date) : ''
    },
    {
      headerName: 'Fecha Ingreso', field: 'fechaingreso', width: 160, sortable: true, filter: true,
      valueGetter: p => p.data?.fechaingreso ? new Date(p.data.fechaingreso as any) : null,
      valueFormatter: p => p.value ? formatDateYMD(p.value as Date) : ''
    },
    { headerName: 'Observación', field: 'observacion', width: 300, sortable: true, filter: true },
    {
      headerName: 'Acciones',
      colId: 'acciones',
      width: 80,
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
        this.rowData = resp ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener asientos:', err);
        this.error = err?.message ?? 'Error al cargar';
        this.loading = false;
      }
    });
  }


  
  // Usamos quickFilter por binding en el template; no hace falta tocar el API
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
        maxWidth: '95vw',   // por defecto Material limita a 80vw
        height: '90vh',
        panelClass: 'asiento-dialog',  // clase para estilos finos
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

   

}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${day}-${m}-${y}`;
  // return `${y}-${m}-${day}`;
}

/** Helpers de celdas */
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