import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AgGridAngular } from 'ag-grid-angular';
import { MatIconModule } from '@angular/material/icon';
import { FacturaGlobalService, ClienteCodpreGrupoResponse } from 'src/app/services/factura-global.service';

import {
  ColDef, GridApi, GridReadyEvent, ModuleRegistry, IRowNode, AllCommunityModule
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-facturacion-global',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, AgGridAngular,
    MatIconModule
  ],
  templateUrl: './facturacion-global.component.html',
  styleUrls: ['./facturacion-global.component.css']
})
export class FacturacionGlobalComponent implements OnInit {
    @ViewChild('qfInput') qfInput!: ElementRef<HTMLInputElement>;
  hasQf = false; // muestra/oculta el botón "X"
  activeTab: 'Factura' | 'Listado' = 'Factura';
  formFactura!: FormGroup;

  private gridApi!: GridApi;
  private pendingQuickFilter = '';
  cargando = false;

  totalSeleccionado = 0;
  selectedCount = 0;
  showSoloSeleccionados = false;



  @HostListener('window:resize')
  onResize() { this.gridApi?.sizeColumnsToFit(); }

  columnDefs: ColDef[] = [
    { headerName: '', checkboxSelection: true, headerCheckboxSelection: true, width: 48, pinned: 'left' },
    { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 60, pinned: 'left' },
    { headerName: 'Cod.Cliente', field: 'codCliente', minWidth: 90 },
    { headerName: 'RUC', field: 'ruc', minWidth: 145 },
    {
      headerName: 'Cliente',
      field: 'cliente',
      minWidth: 220,
      headerTooltip: 'Nombre del cliente',
      tooltipValueGetter: p => {
        const d = p.data ?? {};
        return `${p.value}
RUC: ${d.ruc ?? ''}
Ciudad: ${d.ciudad ?? ''}
Prefijo: ${d.prefijo ?? ''}`;
      }
    },
    { headerName: 'Grupo', field: 'grupo', width: 100 },
    { headerName: 'Prefijo', field: 'prefijo', width: 110, cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header' },
    {
      headerName: 'Valor',
      field: 'valor',
      width: 120,
      valueFormatter: p => this.money(Number(p.value)),
      cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header'
    },
    {
      headerName: 'Subtotal',
      field: 'subtotal',
      width: 135,
      valueFormatter: p => this.money(Number(p.value)),
      cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header'
    },
    {
      headerName: 'IVA',
      field: 'iva',
      width: 120,
      valueFormatter: p => this.money(Number(p.value)), // MONTO
      cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header'
    },
    {
      headerName: 'Total',
      field: 'total',
      width: 135,
      valueFormatter: p => this.money(Number(p.value)),
      cellClass: 'ag-right-aligned-cell', headerClass: 'ag-right-aligned-header'
    },
    { headerName: 'Ciudad', field: 'ciudad', minWidth: 110 }
  ];

  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true };

  rowData: any[] = [];

  constructor(
    private fb: FormBuilder,
    private facturaGlobalService: FacturaGlobalService
  ) {}

  ngOnInit(): void {
    this.formFactura = this.fb.group({
      anio: [new Date().getFullYear().toString(), [Validators.required, Validators.pattern(/^\d{4}$/)]],
      // término rápido opcional para el endpoint:
      termino: [''],
      prefijo: ['']
    });
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;

    // Filtro externo: solo seleccionados
    this.gridApi.setGridOption('isExternalFilterPresent', this.isExternalFilterPresent);
    this.gridApi.setGridOption('doesExternalFilterPass', this.doesExternalFilterPass);

    if (this.pendingQuickFilter) this.gridApi.setGridOption('quickFilterText', this.pendingQuickFilter);
    this.gridApi.sizeColumnsToFit();
  }

  cambiarTab(tab: 'Factura' | 'Listado') {
    this.activeTab = tab;
    if (tab === 'Factura' && this.gridApi) setTimeout(() => this.gridApi.sizeColumnsToFit());
  }

  money(v: number) {
    const n = Number(v ?? 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onQuickFilter(e: Event) {
  const value = (e.target as HTMLInputElement).value || '';
  this.hasQf = !!value.trim();                    // <— MUESTRA/OCULTA EL ÍCONO
  if (this.gridApi) this.gridApi.setGridOption('quickFilterText', value);
  else this.pendingQuickFilter = value;
}

clearBusqueda() {
  this.pendingQuickFilter = '';
  this.hasQf = false;                             // <— APAGA EL ÍCONO
  if (this.qfInput) this.qfInput.nativeElement.value = '';
  if (this.gridApi) {
    this.gridApi.setGridOption('quickFilterText', '');
    this.gridApi.onFilterChanged();
  }
}

  private parseNumber(v: any): number {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/,/g, '').trim();
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }

  onSelectionChanged() {
    if (!this.gridApi) return;
    const rows = this.gridApi.getSelectedRows();
    this.selectedCount = rows.length;
    this.totalSeleccionado = rows.reduce((sum, r) => sum + this.parseNumber(r.total), 0);
    if (this.showSoloSeleccionados) this.gridApi.onFilterChanged();
  }

  // Filtro externo (solo seleccionados)
  isExternalFilterPresent = (): boolean => this.showSoloSeleccionados;
  doesExternalFilterPass = (node: IRowNode): boolean => !!node.isSelected();
  toggleSoloSeleccionados() { this.showSoloSeleccionados = !this.showSoloSeleccionados; this.gridApi?.onFilterChanged(); }
  limpiarSeleccion() { this.gridApi?.deselectAll(); this.onSelectionChanged(); }

  // --- CLICK en Buscar ---
  buscar() {
    if (this.formFactura.invalid) return;

    const termino = this.formFactura.get('termino')?.value?.trim();
    const prefijo = this.formFactura.get('prefijo')?.value?.trim();

    this.cargando = true;
    this.facturaGlobalService
      .getClientesCodpreGrupo({
        busquedaGeneral: termino,
        prefijoBusqueda: prefijo
      })
      .subscribe({
        next: (rows: ClienteCodpreGrupoResponse[]) => {
          this.rowData = (rows ?? []).map(r => ({
            codCliente: r.codcli,
            ruc: r.ruccli,
            cliente: r.nomcli,
            grupo: r.codigo_Grupo,
            prefijo: r.codpre,
            valor: r.mantenimiento ?? 0,
            subtotal: r.subtotal ?? 0,
            iva: r.iva ?? 0,
            total: r.total ?? 0,
            ciudad: r.ciudad ?? ''
          }));

          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            this.gridApi.sizeColumnsToFit();
            this.gridApi.deselectAll();
          }

          this.totalSeleccionado = 0;
          this.selectedCount = 0;
        },
        error: (err) => {
          console.error('[FacturaGlobal] error al buscar:', err);
        },
        complete: () => (this.cargando = false)
      });
  }
  cancelar() {
  // 1) Formulario: restablecer a valores por defecto
  const anioPorDefecto = new Date().getFullYear().toString();
  this.formFactura.reset({
    anio: anioPorDefecto,
    termino: '',
    prefijo: ''
  });
  this.formFactura.markAsPristine();
  this.formFactura.markAsUntouched();

  // 2) Quick filter del grid: limpiar input y estado
  this.hasQf = false;
  this.pendingQuickFilter = '';
  if (this.qfInput) this.qfInput.nativeElement.value = '';

  // 3) Grid: limpiar datos, filtros y selección
  this.rowData = [];
  if (this.gridApi) {
    this.gridApi.setGridOption('rowData', []);   // borra filas
    this.gridApi.deselectAll();                  // sin selección
    this.gridApi.setFilterModel(null);           // filtros de columnas
    this.gridApi.setGridOption('quickFilterText', ''); // quick filter
    this.gridApi.onFilterChanged();
    // si usas filtro externo "solo seleccionados", lo apagamos
    if (this.showSoloSeleccionados) {
      this.showSoloSeleccionados = false;
      this.gridApi.onFilterChanged();
    }
  }

  // 4) Totales y estado varios
  this.totalSeleccionado = 0;
  this.selectedCount = 0;
  this.cargando = false;
}

  
}
