import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-permisos',
  templateUrl: './reporte-permisos.component.html',
  styleUrls: ['./reporte-permisos.component.css']
})
export class ReportePermisosComponent implements OnInit {
  form!: FormGroup;

  meses = [
    { id: 1, nombre: '01' },
    { id: 2, nombre: '02' },
    { id: 3, nombre: '03' },
    { id: 4, nombre: '04' },
    { id: 5, nombre: '05' },
    { id: 6, nombre: '06' },
    { id: 7, nombre: '07' },
    { id: 8, nombre: '08' },
    { id: 9, nombre: '09' },
    { id: 10, nombre: '10' },
    { id: 11, nombre: '11' },
    { id: 12, nombre: '12' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      todos: [false],
      aprobados: [false],
      pendientes: [false],
      rechazados: [false],
      mes: [''],
      anio: ['']
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      todos: false,
      aprobados: false,
      pendientes: true,
      rechazados: false,
      mes: 1,
      anio: 2025
    });
  }

  generar(): void {
    console.log('Reporte de Permisos:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      todos: false,
      aprobados: false,
      pendientes: false,
      rechazados: false,
      mes: '',
      anio: ''
    });
  }

  grabar(): void {
    console.log('Grabar reporte:', this.form.value);
  }
}