import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-entrada-salidas',
  templateUrl: './reporte-entrada-salidas.component.html',
  styleUrls: ['./reporte-entrada-salidas.component.css']
})
export class ReporteEntradaSalidasComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fechaInicial: [''],
      fechaFinal: [''],
      porEntrada: [true],
      porSalida: [false]
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      fechaInicial: '2026-04-01',
      fechaFinal: '2026-04-30',
      porEntrada: true,
      porSalida: false
    });
  }

  aceptar(): void {
    console.log('Reporte de Entrada y Salidas:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}