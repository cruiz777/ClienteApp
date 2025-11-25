// src/app/asientos/asientos-form/asiento-form.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi,
  ColDef,
  ValueParserParams,
  ValueGetterParams,
  ValueSetterParams,
  ICellRendererParams,
  CellValueChangedEvent,
  SuppressKeyboardEventParams,
  EditableCallbackParams,
} from 'ag-grid-community';

import { PlanCuentasEditorComponent } from './plan-cuentas-editor.component';
import { SesionCaducadaDialog } from './sesion-caducada.dialog';

@Component({
  selector: 'app-asiento-form',
  templateUrl: './asiento-form.component.html',
  styleUrls: ['./asiento-form.component.css'],
})
export class AsientoFormComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  form = this.fb.group({
    tipoAsiento: ['DIARIO', Validators.required],
    numero: [''],
    fecha: [new Date(), Validators.required],
    concepto: [''],
  });

  /** Tipado extendido solo para compatibilidad con proyectos antiguos. */
  private gridApi!: GridApi & {
    setPinnedBottomRowData?: (rows: any[]) => void;
  };

  rowData: any[] = [];

  public components = { planCuentasEditor: PlanCuentasEditorComponent };

  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, resizable: true, filter: true };

  gridOptions = {
    rowHeight: 40,
    headerHeight: 40,
    stopEditingWhenCellsLoseFocus: true,
    suppressScrollOnNewData: true,
    onCellValueChanged: (e: CellValueChangedEvent) => this.onCellValueChanged(e),
    components: this.components,
  };

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.columnDefs = [
      {
        headerName: 'N°',
        valueGetter: (p: ValueGetterParams) =>
          p.node ? ((p.node.rowIndex ?? 0) + 1) : 0,
        width: 70, pinned: 'left', suppressMovable: true,
      },

      { headerName: 'cuentaId', field: 'cuentaId', hide: true },
      { headerName: 'CodigoReal', field: 'codigo', hide: true },
      { headerName: 'DescripcionCuenta', field: 'descripcionCuenta', hide: true },

      {
        headerName: 'Código',
        field: 'codigoDisplay',
        editable: true,
        flex: 1.8,
        cellEditor: 'planCuentasEditor',
        cellEditorPopup: true,
        valueGetter: (p: ValueGetterParams) => {
          const codigo = (p.data as any)?.codigo ?? '';
          const desc = (p.data as any)?.descripcionCuenta ?? '';
          return codigo && desc ? `${codigo}. ${desc}` : (codigo || '');
        },
        valueSetter: (p: ValueSetterParams) => {
          (p.data as any).codigoDisplay = p.newValue;
          return true;
        },
        cellRenderer: (params: ICellRendererParams) => {
          const wrap = document.createElement('div');
          wrap.style.display = 'flex';
          wrap.style.alignItems = 'center';
          wrap.style.gap = '6px';

          const span = document.createElement('span');
          const codigo = (params.data as any)?.codigo ?? '';
          const desc = (params.data as any)?.descripcionCuenta ?? '';
          span.textContent = codigo && desc ? `${codigo}. ${desc}` : (codigo || '');
          span.style.flex = '1';
          wrap.appendChild(span);

          const btn = document.createElement('button');
          btn.title = 'Buscar plan de cuentas';
          btn.textContent = '🔍';
          btn.style.border = 'none';
          btn.style.background = 'transparent';
          btn.style.cursor = 'pointer';
          btn.onclick = () => {
            this.agGrid.api.startEditingCell({
              rowIndex: params.node?.rowIndex ?? 0,
              colKey: 'codigoDisplay',
            });
          };
          wrap.appendChild(btn);
          return wrap;
        },
      },

      { headerName: 'Nota', field: 'nota', editable: true, flex: 1.2, cellEditor: 'agTextCellEditor' },

      {
        headerName: 'Debe',
        field: 'debe',
        editable: (p: EditableCallbackParams) => this.editableDebe(p),
        width: 140,
        type: 'numericColumn',
        valueParser: (p: ValueParserParams) => this.numberParser(p),
        valueSetter: (p: ValueSetterParams) => this.setDebe(p),
        valueFormatter: (p) => this.formatMoney((p as any).value),
        cellClass: ['ag-right-aligned-cell'],
        cellClassRules: this.conflictRule,
        suppressKeyboardEvent: (p: SuppressKeyboardEventParams) => this.suppressNonNumericKeys(p),
      },

      {
        headerName: 'Haber',
        field: 'haber',
        editable: (p: EditableCallbackParams) => this.editableHaber(p),
        width: 140,
        type: 'numericColumn',
        valueParser: (p: ValueParserParams) => this.numberParser(p),
        valueSetter: (p: ValueSetterParams) => this.setHaber(p),
        valueFormatter: (p) => this.formatMoney((p as any).value),
        cellClass: ['ag-right-aligned-cell'],
        cellClassRules: this.conflictRule,
        suppressKeyboardEvent: (p: SuppressKeyboardEventParams) => this.suppressNonNumericKeys(p),
      },

      { headerName: 'Plantilla', field: 'plantilla', editable: true, width: 120,
        cellRenderer: 'agCheckboxCellRenderer', cellEditor: 'agCheckboxCellEditor' },
      { headerName: 'CENTRO DE COSTOS', field: 'cc', editable: true, width: 170,
        cellRenderer: 'agCheckboxCellRenderer', cellEditor: 'agCheckboxCellEditor' },
      { headerName: 'LÍNEA DE NEGOCIOS', field: 'ln', editable: true, width: 170,
        cellRenderer: 'agCheckboxCellRenderer', cellEditor: 'agCheckboxCellEditor' },

      {
        headerName: 'Acción', width: 100, pinned: 'right', sortable: false, filter: false,
        cellRenderer: (params: ICellRendererParams) => {
          const btn = document.createElement('button');
          btn.className = 'btn-delete';
          btn.title = 'Eliminar';
          btn.innerText = '🗑';
          btn.onclick = () => this.eliminarFila(params.node?.rowIndex ?? 0);
          return btn;
        },
      },
    ];
  }

  // ===== helpers de formato =====
  numberParser = (params: ValueParserParams): number | null => {
    const v = (params.newValue ?? '').toString().replace(',', '.').trim();
    if (v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  formatMoney = (v: any): string => {
    const n = Number(v);
    if (isNaN(n)) return '';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  suppressNonNumericKeys = (p: SuppressKeyboardEventParams): boolean => {
    const k = (p.event as KeyboardEvent | undefined)?.key;
    if (!k) return false;
    const allowed =
      /[0-9.,]/.test(k) ||
      ['Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'].includes(k);
    return !allowed;
  };

  // ===== XOR Debe/Haber =====
  setDebe = (p: ValueSetterParams): boolean => {
    const v = this.numberParser({ newValue: p.newValue } as any);
    (p.data as any).debe = v;
    if (v && v > 0) (p.data as any).haber = null;
    return true;
  };
  setHaber = (p: ValueSetterParams): boolean => {
    const v = this.numberParser({ newValue: p.newValue } as any);
    (p.data as any).haber = v;
    if (v && v > 0) (p.data as any).debe = null;
    return true;
  };
  editableDebe = (p: EditableCallbackParams) => {
    const h = Number((p.data as any)?.haber ?? 0);
    return isNaN(h) || h === 0;
  };
  editableHaber = (p: EditableCallbackParams) => {
    const d = Number((p.data as any)?.debe ?? 0);
    return isNaN(d) || d === 0;
  };
  conflictRule = {
    'cell-conflict': (p: any) => Number(p.data?.debe ?? 0) > 0 && Number(p.data?.haber ?? 0) > 0,
  };

  private toast = (msg: string) => this.snack.open(msg, 'OK', { duration: 2500 });

  onCellValueChanged = (e: CellValueChangedEvent) => {
    const d = Number((e.data as any)?.debe ?? 0);
    const h = Number((e.data as any)?.haber ?? 0);
    if (d > 0 && h > 0) {
      if (e.colDef.field === 'debe') (e.data as any).haber = null;
      else if (e.colDef.field === 'haber') (e.data as any).debe = null;
      else (e.data as any).haber = null;
      this.toast('Solo puede tener valor en Debe o en Haber, no en ambos.');
      this.agGrid.api.refreshCells({ force: true });
    }
    this.actualizarTotales();
  };

  // ===== Totales / Diferencia =====
  actualizarTotales = () => {
    if (!this.agGrid?.api) return;
    let totalDebe = 0, totalHaber = 0;
    this.agGrid.api.forEachNodeAfterFilterAndSort(n => {
      const d = Number((n.data as any)?.debe ?? 0);
      const h = Number((n.data as any)?.haber ?? 0);
      if (!isNaN(d)) totalDebe += d;
      if (!isNaN(h)) totalHaber += h;
    });
    const diferencia = totalDebe - totalHaber;

    this.gridApi = this.agGrid.api as any;

    // Compatibilidad: método antiguo o API nueva setGridOption
    const rows = [
      { codigoDisplay: 'Total', debe: totalDebe, haber: totalHaber },
      { codigoDisplay: 'Diferencia', debe: diferencia, haber: null },
    ];
    if (this.gridApi.setPinnedBottomRowData) {
      this.gridApi.setPinnedBottomRowData(rows);
    } else {
      this.agGrid.api.setGridOption('pinnedBottomRowData', rows);
    }
  };

  // ===== Crear / Agregar / Eliminar filas =====
  private crearFilaBase(preset?: Partial<any>) {
    return {
      cuentaId: null,
      codigo: '',
      descripcionCuenta: '',
      codigoDisplay: '',
      nota: '',
      debe: null,
      haber: null,
      plantilla: false,
      cc: true,
      ln: true,
      ...(preset || {}),
    };
  }

  // Agrega esta propiedad (necesaria para usar tu editor Angular)
public frameworkComponents = { planCuentasEditor: PlanCuentasEditorComponent };

// Reemplaza agregarFila por esta versión robusta
public agregarFila = (preset?: Partial<any>) => {
  const nueva = this.crearFilaBase(preset);

  // Si el grid ya está listo, usa applyTransaction (AG Grid moderno)
  if (this.agGrid?.api) {
    this.agGrid.api.applyTransaction({ add: [nueva] });

    // ir al final y abrir editor
    const last = this.agGrid.api.getDisplayedRowCount() - 1;
    setTimeout(() => {
      this.agGrid.api.ensureIndexVisible(last);
      this.agGrid.api.startEditingCell({ rowIndex: last, colKey: 'codigoDisplay' });
      this.actualizarTotales();
    }, 0);
    return;
  }

  // Fallback inicial (antes de gridReady render)
  this.rowData = [...this.rowData, nueva];
};

// Reemplaza eliminarFila por esta versión
eliminarFila = (index: number) => {
  if (!this.agGrid?.api) {
    // Fallback por si no hay api listo
    this.rowData = this.rowData.filter((_, i) => i !== index);
    this.actualizarTotales();
    return;
  }
  const row = this.agGrid.api.getDisplayedRowAtIndex(index)?.data;
  if (!row) return;
  this.agGrid.api.applyTransaction({ remove: [row] });
  this.actualizarTotales();
};


  guardar = () => {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const cabecera = this.form.getRawValue();
    const detalle: any[] = [];
    this.agGrid.api.forEachNodeAfterFilterAndSort(n => {
      if (!n.data || n.rowPinned) return;
      detalle.push({
        cuentaId: (n.data as any).cuentaId,
        codigo: (n.data as any).codigo,
        descripcionCuenta: (n.data as any).descripcionCuenta,
        nota: (n.data as any).nota,
        debe: (n.data as any).debe,
        haber: (n.data as any).haber,
        plantilla: (n.data as any).plantilla,
        cc: (n.data as any).cc,
        ln: (n.data as any).ln,
      });
    });
    console.log('CABECERA', cabecera);
    console.log('DETALLE', detalle);
  };

  cancelar = () => {};
  eliminarCheque = () => {};
  simularSesionCaducada = () => {
    this.dialog.open(SesionCaducadaDialog, { disableClose: true, width: '520px' });
  };
}
