import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-creacion-anticipos',
  templateUrl: './creacion-anticipos.component.html',
  styleUrls: ['./creacion-anticipos.component.css']

})
export class CreacionAnticiposComponent {
private fb = inject(FormBuilder);

  numeroAnticipo = 1;

  form: FormGroup = this.fb.group({
    fecha: [null, Validators.required],
    caja: [''],
    cajero: [''],
    cliente: ['', Validators.required],
    tipoAnticipo: ['', Validators.required],
    monto: [null, [Validators.required, Validators.min(0.01)]],
    banco: [''],
    descrPago: [''],
    noTarjeta: [''],
    autorizado: [''],
    saldo: [''],
    estado: [''],
    nombre: [''],
    concepto: [''],
    lote: [''],
    plazo: ['']
  });

  // ===== Acciones =====
  nuevo(): void {
    this.form.reset();
    this.numeroAnticipo += 1;
  }

  grabar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    // aquí iría tu servicio HTTP
    const payload = { numero: this.numeroAnticipo, ...this.form.value };
    console.log('Grabar anticipo:', payload);
    
  }

  imprimir(): void {
    // placeholder: abre impresión o genera PDF
    console.log('Imprimir anticipo', this.numeroAnticipo);
  }

  anular(): void {
    // placeholder de anulación
    console.log('Anular anticipo', this.numeroAnticipo);
  }

  cancelar(): void {
    this.form.reset(this.form.value);
    console.log('Cancelar');
  }

  // helpers UI
  get f() { return this.form.controls; }

}
