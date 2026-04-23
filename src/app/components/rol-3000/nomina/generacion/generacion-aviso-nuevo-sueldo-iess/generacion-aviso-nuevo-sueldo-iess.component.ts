import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-generacion-aviso-nuevo-sueldo-iess',
  templateUrl: './generacion-aviso-nuevo-sueldo-iess.component.html',
  styleUrls: ['./generacion-aviso-nuevo-sueldo-iess.component.css']
})
export class GeneracionAvisoNuevoSueldoIessComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      periodo: ['', Validators.required]
    });

    this.cargarMock();
  }

  cargarMock(): void {
    this.form.patchValue({
      periodo: '2026-04-30'
    });
  }

  aceptar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Generación Aviso Nuevo Sueldo IESS:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      periodo: ''
    });
  }
}