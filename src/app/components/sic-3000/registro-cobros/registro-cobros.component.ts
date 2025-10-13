import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';

@Component({
  selector: 'app-registro-cobros',
  templateUrl: './registro-cobros.component.html',
  styleUrls: ['./registro-cobros.component.css']
})
export class RegistroCobrosComponent implements OnInit {
  clienteForm!: FormGroup;
  formaPagoForm!: FormGroup;

  @ViewChild('stepper') stepper!: MatStepper;

  formasPago: any[] = [];
  displayedColumns: string[] = [
    'formaPago', 'valor', 'documento', 'banco', 'titular',
    'lote', 'fechaEmision', 'autorizacion', 'fechaAutorizacion', 'observacion'
  ];
  total = 0;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForms();
  }

  private initForms(): void {
    this.clienteForm = this.fb.group({
      cliente: ['', Validators.required],
      factura: ['', Validators.required],
      fechaRegistro: ['', Validators.required],
      formaPago: ['', Validators.required],
      fechaPago: ['', Validators.required],
      valorCxc: [0, [Validators.required, Validators.min(0)]],
      abono: [0, [Validators.required, Validators.min(0)]],
      saldo: [0, [Validators.required, Validators.min(0)]]
    });

    this.formaPagoForm = this.fb.group({
      metodoPago: ['efectivo', Validators.required],
      tipo: ['', Validators.required],
      valor: [0, [Validators.required, Validators.min(0.01)]],
      documento: ['', Validators.required],
      banco: [''],
      titular: [''],
      lote: [''],
      fechaEmision: ['', Validators.required],
      autorizacion: [''],
      fechaAutorizacion: [''],
      observacion: ['']
    });
  }

  cancelar(): void {
    this.clienteForm.reset();
    this.formaPagoForm.reset({ metodoPago: 'efectivo' });
    this.formasPago = [];
    this.total = 0;
    if (this.stepper) {
      this.stepper.reset();
    }
  }

  siguiente(): void {
    if (this.clienteForm.valid) {
      this.stepper.next();
    } else {
      this.clienteForm.markAllAsTouched();
    }
  }

  regresar(): void {
    this.stepper.previous();
  }

  agregarFormaPago(): void {
    if (this.formaPagoForm.valid) {
      const forma = this.formaPagoForm.value;
      this.formasPago.push(forma);
      this.total += parseFloat(forma.valor || 0);
      this.formaPagoForm.reset({ metodoPago: 'efectivo' });
    } else {
      this.formaPagoForm.markAllAsTouched();
    }
  }

  liquidar(): void {
    if (this.clienteForm.invalid || this.formasPago.length === 0) {
      alert('Complete los datos del cliente y al menos una forma de pago.');
      return;
    }
    // Procesar los datos
    console.log('Datos del Cliente:', this.clienteForm.value);
    console.log('Formas de Pago:', this.formasPago);
  }
}
