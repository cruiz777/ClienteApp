import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-impresion-contabilidad',
  templateUrl: './impresion-contabilidad.component.html',
  styleUrls: ['./impresion-contabilidad.component.css']
})
export class ImpresionContabilidadComponent implements OnInit {
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