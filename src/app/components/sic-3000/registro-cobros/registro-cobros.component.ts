import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  selector: 'app-registro-cobros',
  templateUrl: './registro-cobros.component.html',
  styleUrls: ['./registro-cobros.component.css']
})
export class RegistroCobrosComponent implements OnInit {

  /** Control del stepper (1 = Datos del Cliente, 2 = Forma de Pago) */
  step = 1;

  /** Paso 1: Datos del Cliente */
  formCliente!: FormGroup;

  /** Paso 2: Forma de Pago */
  formPago!: FormGroup;

  /** AG Grid */
  private gridApi!: GridApi;
  columnDefs: ColDef[] = [
    { headerName: 'No. Factura', editable:false, field: 'numero', minWidth: 160, pinned: 'left' },
    { headerName: 'Fecha', editable:false, field: 'fecha', width: 120 },
    {
      headerName: 'Monto', editable:false, field: 'monto', width: 120, type: 'rightAligned',
      valueFormatter: p => this.usd(p.value)
    },
    {
      headerName: 'Pago', editable:true, field: 'pago', width: 120, type: 'rightAligned',
      valueFormatter: p => this.usd(p.value)
    },
    { headerName: 'Estado', field: 'estado', width: 170 },
    {
      headerName: 'Vence', field: 'vence', width: 120,
      cellClass: p => (p.data?.valueVencido ? 'text-danger fw-bold' : '')
    },
    { headerName: 'Descripción', field: 'descripcion', flex: 1, minWidth: 220 },
    { headerName: 'Ord', field: 'ord', width: 80 }
  ];
  defaultColDef: ColDef = { resizable: true, sortable: true, filter: true };

  rowData = [
    { numero: 'F - 00202100009308', fecha: '14/08/2025', monto: 189.75, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009305', fecha: '14/08/2025', monto: 498.81, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009306', fecha: '14/08/2025', monto: 498.81, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009307', fecha: '14/08/2025', monto: 240.48, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009308', fecha: '14/08/2025', monto: 250.41, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '14/08/2025', valueVencido: true,  descripcion: 'CRÉDITO PERSONAL', ord: 1 },
    { numero: 'F - 00202100009328', fecha: '25/08/2025', monto: 498.81, pago: 0, estado: 'PENDIENTE DE PAGO', vence: '25/08/2025', valueVencido: false, descripcion: 'CRÉDITO PERSONAL', ord: 1 }
  ];

  /** Catálogos demo usados en Paso 2 */
  tipos = [
    'Transferencia Pichincha', 'Transferencia Produbanco', 'Cheque',
    'Depósito', 'Efectivo', 'Tarjeta Crédito', 'Tarjeta Débito'
  ];
  bancos = [
    'Banco Pichincha', 'Produbanco', 'Banco Guayaquil', 'Banco Pacífico', 'Otro'
  ];

  /** Acumulador opcional de formas de pago agregadas */
  formasPagoAgregadas: any[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // === Paso 1 === (un solo campo para cliente y para responsable)
    this.formCliente = this.fb.group({
      noPago: [''],
      fechaPago: ['', Validators.required],
      cliente: [''],          // 👈 único campo
      responsable: [''],      // 👈 único campo
      valorAPagar: ['0.00'],
      montoDeuda: ['0.00'],
      observacion: ['']
    });

    // === Paso 2 === (igual)
    this.formPago = this.fb.group({
      categoriaPago: ['efectivo', Validators.required], // efectivo | tarjeta
      tipo: ['', Validators.required],
      valor: [''],
      fechaEmision: [''],
      banco: [''],
      numeroDocumento: [''],
      loteRecap: [''],
      propietario: [''],
      autorizacion: [''],
      fechaAutorizacion: [''],
      observacion: ['']
    });
  }

  /** Helper para clases de validación Bootstrap */
  invalid(form: FormGroup, ctrl: string) {
    const c = form.get(ctrl);
    return { 'is-invalid': !!c && c.touched && c.invalid };
  }

  // ===== AG Grid =====
  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    this.gridApi.sizeColumnsToFit();
  }

  usd(v: number) {
    if (v == null) { return ''; }
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(v);
  }

  // ===== Acciones Paso 1 =====
  onCancel(): void {
    this.formCliente.reset({
      noPago: '',
      fechaPago: '',
      cliente: '',
      responsable: '',
      valorAPagar: '0.00',
      montoDeuda: '0.00',
      observacion: ''
    });

    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', ''); // v31+
      this.gridApi.setFilterModel(null);
      this.gridApi.deselectAll();
    }

    this.onCancelarPago();
    this.step = 1;
  }

  onNext(): void {
    if (this.formCliente.invalid) {
      this.formCliente.markAllAsTouched();
      return;
    }
    this.step = 2;
  }

  // ===== Acciones Paso 2 =====
  onCancelarPago(): void {
    this.formPago.reset({
      categoriaPago: 'efectivo', tipo: '', valor: '',
      fechaEmision: '', banco: '', numeroDocumento: '',
      loteRecap: '', propietario: '', autorizacion: '',
      fechaAutorizacion: '', observacion: ''
    });
  }

  onAddPago(): void {
    if (this.formPago.invalid) {
      this.formPago.markAllAsTouched();
      return;
    }
    const pago = this.formPago.getRawValue();
    this.formasPagoAgregadas.push(pago);
    console.log('Pago agregado:', pago);
    this.onCancelarPago();
  }
}
