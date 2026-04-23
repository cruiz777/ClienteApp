import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-terminacion-contrato',
  templateUrl: './terminacion-contrato.component.html',
  styleUrls: ['./terminacion-contrato.component.css']
})
export class TerminacionContratoComponent implements OnInit {
  form!: FormGroup;

  tiposContrato: string[] = [
    'Indefinido',
    'Plazo Fijo',
    'Temporal',
    'Por Horas',
    'Servicios Profesionales'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: [''],
      tipoContrato: ['']
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      fecha: '2026-04-30',
      tipoContrato: 'Plazo Fijo'
    });
  }

  aceptar(): void {
    console.log('Terminación de Contrato:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}