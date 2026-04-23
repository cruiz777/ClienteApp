import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-vacaciones',
  templateUrl: './reporte-vacaciones.component.html',
  styleUrls: ['./reporte-vacaciones.component.css']
})
export class ReporteVacacionesComponent implements OnInit {
  form!: FormGroup;

  departamentos: string[] = [
    'Administración',
    'Admisión',
    'Dietética y Lavandería',
    'Recursos Humanos',
    'Farmacia',
    'Sistemas',
    'Clínico',
    'Radiología'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      pendientes: [false],
      departamento: ['']
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      pendientes: true,
      departamento: 'Dietética y Lavandería'
    });
  }

  generar(): void {
    console.log('Reporte de Vacaciones:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      pendientes: false,
      departamento: ''
    });
  }
}