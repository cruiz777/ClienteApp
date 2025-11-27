import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

interface CuentaPorCobrarRow {
  numero: number;
  cliente: string;
  noFactura: string;
  fecha: string;
  tipo: string;
  debe: number;
  haber: number;
  saldo: number;
  observacion: string;
}
@Component({
  selector: 'app-cuentaxcobrar',
  templateUrl: './cuentaxcobrar.component.html',
  styleUrl: './cuentaxcobrar.component.css',
  
})

export class CuentaxcobrarComponent {
  filtersForm: FormGroup;

  columnDefs: ColDef<CuentaPorCobrarRow>[] = [
    {
      headerName: '#',
      field: 'numero',
      width: 70,
      valueGetter: (params) => params.node?.rowIndex != null ? params.node.rowIndex + 1 : '',
      sortable: false,
      filter: false,
    },
    { headerName: 'Cliente', field: 'cliente', flex: 2, minWidth: 180 },
    { headerName: 'No. Factura', field: 'noFactura', flex: 1, minWidth: 110 },
    { headerName: 'Fecha', field: 'fecha', flex: 1, minWidth: 100 },
    { headerName: 'Tipo', field: 'tipo', flex: 0.7, minWidth: 80 },
    {
      headerName: 'Debe',
      field: 'debe',
      flex: 1,
      minWidth: 90,
      type: 'numericColumn',
      cellClass: 'ag-cell-right',
      valueFormatter: (p) => this.formatNumber(p.value),
    },
    {
      headerName: 'Haber',
      field: 'haber',
      flex: 1,
      minWidth: 90,
      type: 'numericColumn',
      cellClass: 'ag-cell-right',
      valueFormatter: (p) => this.formatNumber(p.value),
    },
    {
      headerName: 'Saldo',
      field: 'saldo',
      flex: 1,
      minWidth: 90,
      type: 'numericColumn',
      cellClass: 'ag-cell-right',
      valueFormatter: (p) => this.formatNumber(p.value),
    },
    { headerName: 'Observación', field: 'observacion', flex: 2, minWidth: 180 },
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
  };

  rowData: CuentaPorCobrarRow[] = [];
  private gridApi!: GridApi<CuentaPorCobrarRow>;
  exportMenuOpen = false;

  constructor(private fb: FormBuilder) {
    this.filtersForm = this.fb.group({
      cliente: [''],
      fechaInicio: [''],
      fechaHasta: [''],
      totales: [false],
      detalle: [false],
    });
  }

  onGridReady(params: GridReadyEvent<CuentaPorCobrarRow>): void {
    this.gridApi = params.api;
  }

  onBuscar(): void {
    const filtros = this.filtersForm.value;
    console.log('Aplicar búsqueda con filtros:', filtros);

    // TODO: llamar a tu servicio de backend.
    // Por ahora, cargamos algunos datos de ejemplo:
    this.rowData = [
      {
        numero: 1,
        cliente: 'CLIENTE DEMO S.A.',
        noFactura: 'F001-000123',
        fecha: '2025-11-26',
        tipo: 'FAC',
        debe: 150.5,
        haber: 0,
        saldo: 150.5,
        observacion: 'Saldo pendiente',
      },
    ];
  }

  onNuevaConsulta(): void {
    this.filtersForm.reset({
      cliente: '',
      fechaInicio: '',
      fechaHasta: '',
      totales: false,
      detalle: false,
    });
    this.rowData = [];
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  exportToExcel(): void {
    if (!this.gridApi) {
      return;
    }
    this.exportMenuOpen = false;
    this.gridApi.exportDataAsExcel({
      fileName: 'explorador_cuentas_por_cobrar.xlsx',
    });
  }

  exportToPdf(): void {
    this.exportMenuOpen = false;
    // Aquí integrarías jsPDF o lo que estés usando para PDF.
    // Dejo el método listo para que lo completes.
    console.log('Exportar a PDF (pendiente de implementación)');
  }

  private formatNumber(value: number): string {
    if (value == null) {
      return '';
    }
    return value.toLocaleString('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
