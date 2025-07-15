import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-registro-cobros',
  templateUrl: './registro-cobros.component.html',
  styleUrls: ['./registro-cobros.component.css']
})
export class RegistroCobrosComponent {
  formCliente: FormGroup;
  formFactura: FormGroup;
  formPago: FormGroup;

  registros = [
    { factura: '', fecha: '', monto: '', pago: '', estado: '', vence: '', descripcion: '' },
  ];

  constructor(private fb: FormBuilder) {
    this.formCliente = this.fb.group({
      clienteCodigo: ['', Validators.required],
      clienteNombre: ['', Validators.required],
      responsableCodigo: ['', Validators.required],
      responsableNombre: ['', Validators.required]
    });

    this.formFactura = this.fb.group({
      fechaPago: ['', Validators.required],
      montoDeuda: [null, Validators.required],
      documentosCredito: [false]
    });

    this.formPago = this.fb.group({
      valorPagar: [null, [Validators.required, Validators.min(0.01)]]
    });
  }

  registrarPago() {
    const datos = {
      cliente: this.formCliente.value,
      factura: this.formFactura.value,
      pago: this.formPago.value,
      registros: this.registros
    };

    console.log('📦 Enviando datos del pago:', datos);
    // Aquí llamarías al servicio HTTP
  }

  cancelar() {
    this.formCliente.reset();
    this.formFactura.reset();
    this.formPago.reset();
    this.registros = [];
  }
}
