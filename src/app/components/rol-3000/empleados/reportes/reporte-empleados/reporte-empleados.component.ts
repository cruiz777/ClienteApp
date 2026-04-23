import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-empleados',
  templateUrl: './reporte-empleados.component.html',
  styleUrls: ['./reporte-empleados.component.css']
})
export class ReporteEmpleadosComponent implements OnInit {
  form!: FormGroup;

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
      areaInicial: [''],
      cargoInicial: [''],
      areaFinal: [''],
      cargoFinal: [''],
      agrupadoPor: [''],
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
      areaInicial: 'Administración',
      cargoInicial: 'Administrador',
      areaFinal: 'Servicios',
      cargoFinal: 'Tecnólogo',
      agrupadoPor: 'Departamento',
      zonaQuito: true,
      tipoFijos: true
    });
  }

  aceptar(): void {
    console.log('Filtro reporte empleados:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}