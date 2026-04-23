import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-cargas',
  templateUrl: './reporte-cargas.component.html',
  styleUrls: ['./reporte-cargas.component.css']
})
export class ReporteCargasComponent implements OnInit {
  form!: FormGroup;

  anios: number[] = [2024, 2025, 2026, 2027];

  areas: string[] = [
    'Administración',
    'Clínico',
    'Servicios',
    'Recursos Humanos',
    'Facturación'
  ];

  cargos: string[] = [
    'Administrador',
    'Auxiliar de Enfermería',
    'Médico Residente',
    'Tecnólogo',
    'Pasante'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      anio: [''],
      cargoInicial: [''],
      areaInicial: [''],
      cargoFinal: [''],
      areaFinal: [''],
      zonaQuito: [false],
      zonaGuayaquil: [false],
      zonaCuenca: [false],
      tipoExempleados: [false],
      tipoHonorarios: [false],
      tipoFijos: [false],
      tipoPorHoras: [false],
      tipoTemporalBecario: [false]
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      anio: 2026,
      areaInicial: 'Administración',
      areaFinal: 'Servicios',
      cargoInicial: 'Administrador',
      cargoFinal: 'Tecnólogo',
      zonaQuito: true,
      tipoFijos: true
    });
  }

  aceptar(): void {
    console.log('Reporte de Cargas:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}