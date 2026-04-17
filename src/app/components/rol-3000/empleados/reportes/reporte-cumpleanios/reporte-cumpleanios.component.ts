import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-cumpleanios',
  templateUrl: './reporte-cumpleanios.component.html',
  styleUrls: ['./reporte-cumpleanios.component.css']
})
export class ReporteCumpleaniosComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fechaInicial: [''],
      fechaFinal: ['']
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      fechaInicial: '2026-04-01',
      fechaFinal: '2026-04-30'
    });
  }

  aceptar(): void {
    console.log('Reporte de cumpleaños:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}