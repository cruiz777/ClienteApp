import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';


@Component({
  selector: 'app-reversion-pago',
  templateUrl: './reversion-pago.component.html',
  styleUrls: ['./reversion-pago.component.css']
  })
export class ReversionPagoComponent {
form!: FormGroup;

  // Catálogo de clientes (demo)
  clientes = [
    { id: 1, nombre: 'Cliente A' },
    { id: 2, nombre: 'Cliente B' },
    { id: 3, nombre: 'Cliente C' }
  ];

  // AG Grid
  @ViewChild(AgGridAngular) agGrid?: AgGridAngular;
  private gridApi!: GridApi;

  columnDefs: ColDef[] = [
    { headerName: 'No. Factura', field: 'numeroFactura', minWidth: 160 },
    { headerName: 'Fecha', field: 'fecha', width: 130, valueFormatter: p => this.fmtFecha(p.value) },
    { headerName: 'Monto', field: 'monto', width: 130, valueFormatter: p => this.fmtMoneda(p.value), type: 'rightAligned' },
    { headerName: 'Estado', field: 'estado', minWidth: 140 }
  ];

  defaultColDef: ColDef = {
    sortable: false,
    resizable: true,
    filter: false,
    editable: false,
    flex: 1
  };

  rowData: any[] = []; // resultados de la consulta

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      numeroPago: [''],
      fechaPago: [''],
      clienteId: [''],
      observacion: [''],
      fechaReversion: ['']
    });
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
  }

  // Acciones
  onConsultar(): void {
    // Simula resultados (reemplaza por tu servicio)
    this.rowData = [
      { numeroFactura: '001-001-00001234', fecha: '2025-07-14', monto: 108.5, estado: 'Aplicado' },
      { numeroFactura: '001-001-00001235', fecha: '2025-07-15', monto: 50.0, estado: 'Aplicado' },
      { numeroFactura: '001-001-00001236', fecha: '2025-07-16', monto: 25.5, estado: 'Parcial' }
    ];
  }

  onRevertirPago(): void {
    if (!this.gridApi) return;
    const sel = this.gridApi.getSelectedRows?.() ?? [];
    if (!sel.length) {
      alert('Seleccione una factura para revertir.');
      return;
    }
    const seleccionado = sel[0];

    const payload = {
      numeroPago: this.form.get('numeroPago')?.value || null,
      fechaReversion: this.form.get('fechaReversion')?.value || null,
      clienteId: this.form.get('clienteId')?.value || null,
      observacion: this.form.get('observacion')?.value || null,
      factura: {
        numeroFactura: seleccionado.numeroFactura,
        fecha: seleccionado.fecha,
        monto: seleccionado.monto,
        estado: seleccionado.estado
      }
    };

    console.log('Revertir Pago =>', payload);
    // TODO: llamar servicio backend:
    // this.cajaService.revertirPago(payload).subscribe(...)
  }

  onImprimir(): void {
    // Implementa tu impresión/descarga PDF
    console.log('Imprimir reversión (parámetros):', this.form.value, this.rowData);
  }

  onCancelar(): void {
    this.form.reset({
      numeroPago: '', fechaPago: '', clienteId: '',
      observacion: '', fechaReversion: ''
    });
    this.rowData = [];
    this.agGrid?.api?.deselectAll();
  }

  // Helpers de formato
  private fmtMoneda(v: any): string {
    const n = Number(v) || 0;
    return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
    // Ej.: $ 1.234,56
  }

  private fmtFecha(v: any): string {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-EC');
  }

}
