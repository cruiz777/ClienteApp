import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-generacion-contabilidad',
  templateUrl: './generacion-contabilidad.component.html',
  styleUrls: ['./generacion-contabilidad.component.css']
})
export class GeneracionContabilidadComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      periodo: ['2026-04-30', Validators.required]
    });
  }

  aceptar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    console.log('Generación para contabilidad:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      periodo: ''
    });
  }
}