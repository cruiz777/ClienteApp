import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-resumen-inec',
  templateUrl: './resumen-inec.component.html',
  styleUrls: ['./resumen-inec.component.css']
})
export class ResumenInecComponent implements OnInit {
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

    console.log('Generar resumen INEC:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}