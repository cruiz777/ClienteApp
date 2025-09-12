import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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

  /** Catálogos demo: reemplaza por servicios reales */
  clientes = [
    { id: 1, nombre: 'Cliente A' },
    { id: 2, nombre: 'Cliente B' }
  ];
  facturas = [
    { id: 100, numero: '001-001-000000123' },
    { id: 101, numero: '001-001-000000124' }
  ];
  formasPago = [
    { id: 1, descripcion: 'Efectivo' },
    { id: 2, descripcion: 'Tarjeta' },
    { id: 3, descripcion: 'Transferencia' }
  ];
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
    // === Paso 1 ===
    this.formCliente = this.fb.group({
      cliente: ['', Validators.required],
      factura: ['', Validators.required],
      fecha: ['', Validators.required],
      formaPago: ['', Validators.required],
      fechaDetalle: ['', Validators.required],
      // estos tres son TEXTO (sin cálculo automático)
      valorCxc: [''],
      abono: [''],
      saldo: ['']
    });

    // === Paso 2 ===
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

  // ===== Acciones Paso 1 =====
  onCancel(): void {
    this.formCliente.reset({
      cliente: '', factura: '', fecha: '',
      formaPago: '', fechaDetalle: '',
      valorCxc: '', abono: '', saldo: ''
    });
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
