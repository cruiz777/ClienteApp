import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from 'ag-grid-community';

type Row = {
  idx: number;
  cliente: string;
  factura: string;
  fecha: string;   // ISO yyyy-mm-dd
  tipo: string;
  debe: number;
  haber: number;
  saldo: number;
  observacion: string;
};

@Component({
  selector: 'app-explorador-estado-cuenta',
  templateUrl: './explorador-estado-cuenta.component.html',
  styleUrls: ['./explorador-estado-cuenta.component.css']
})
export class ExploradorEstadoCuentaComponent {
  form: FormGroup;
  pageSize = 20;

  rowData: Row[] = []; // binding de Angular: asignar aquí refresca el grid

  columnDefs: ColDef<Row>[] = [
    {
      headerName: '#',
      field: 'idx',
      width: 70,
      valueGetter: (p) => (p.node ? p.node.rowIndex! + 1 : ''),
      sortable: true
    },
    { headerName: 'Cliente', field: 'cliente', minWidth: 180, flex: 1, sortable: true },
    { headerName: 'No. Factura', field: 'factura', width: 130, sortable: true },
    {
      headerName: 'Fecha',
      field: 'fecha',
      width: 120,
      sortable: true,
      valueFormatter: (p) => this.fmtFecha(p.value)
    },
    { headerName: 'Tipo', field: 'tipo', width: 110, sortable: true },
    {
      headerName: 'Debe',
      field: 'debe',
      width: 120,
      type: 'rightAligned',
      valueFormatter: (p) => this.fmtUSD(p)
    },
    {
      headerName: 'Haber',
      field: 'haber',
      width: 120,
      type: 'rightAligned',
      valueFormatter: (p) => this.fmtUSD(p)
    },
    {
      headerName: 'Saldo',
      field: 'saldo',
      width: 120,
      type: 'rightAligned',
      valueFormatter: (p) => this.fmtUSD(p)
    },
    { headerName: 'Observación', field: 'observacion', minWidth: 160, flex: 1 }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    filter: true,
    sortable: true
  };

  private gridApi!: GridApi<Row>;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      clienteInicial: [''],
      clienteFinal: [''],
      fechaInicial: [''],
      fechaHasta: [''],
      soloTotales: [false],
      conDetalle: [true]
    });
  }

  // Se guarda la API para exportar, paginar, etc.
  onGridReady(e: GridReadyEvent<Row>) {
    this.gridApi = e.api;
  }

  // --- Acciones ---
  async nuevaConsulta() {
    // TODO: reemplazar por llamada real a tu backend usando this.form.value
    const mock: Row[] = [
      {
        idx: 1,
        cliente: 'CLÍNICA PASTEUR',
        factura: 'FAC-001',
        fecha: '2025-10-01',
        tipo: 'FAC',
        debe: 120.5,
        haber: 0,
        saldo: 120.5,
        observacion: ''
      },
      {
        idx: 2,
        cliente: 'CLÍNICA PASTEUR',
        factura: 'PAG-001',
        fecha: '2025-10-03',
        tipo: 'PAG',
        debe: 0,
        haber: 120.5,
        saldo: 0,
        observacion: 'Transferencia'
      }
    ];

    // Actualiza el grid con data-binding (recomendado)
    this.rowData = mock;

    // Alternativa API moderna:
    // if (this.gridApi) this.gridApi.setGridOption('rowData', mock);
  }

  exportarCsv() {
    if (!this.gridApi) return;
    this.gridApi.exportDataAsCsv({
      fileName: 'estado_cuenta.csv',
      columnSeparator: ';'
    });
  }

  cancelar() {
    this.form.reset({ soloTotales: false, conDetalle: true });
    this.rowData = [];
    // Alternativa API moderna:
    // if (this.gridApi) this.gridApi.setGridOption('rowData', []);
  }

  // --- Formatters ---
  private fmtUSD(p: ValueFormatterParams<Row> | number | null | undefined): string {
    const val = typeof p === 'number' ? p : (p as ValueFormatterParams<Row>)?.value as number;
    const n = isNaN(Number(val)) ? 0 : Number(val);
    return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
  }

  private fmtFecha(v: unknown): string {
    if (!v) return '';
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('es-EC');
  }
}
