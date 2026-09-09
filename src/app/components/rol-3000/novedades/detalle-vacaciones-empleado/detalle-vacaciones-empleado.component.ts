import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface Empleado {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-detalle-vacaciones-empleado',
  templateUrl: './detalle-vacaciones-empleado.component.html',
  styleUrls: ['./detalle-vacaciones-empleado.component.css']
})
export class DetalleVacacionesEmpleadoComponent implements OnInit {
  form!: FormGroup;

  empleados: Empleado[] = [
    { id: 201, nombre: 'Benavides Tates Maria Esthela' },
    { id: 116, nombre: 'Abata Bautista Amparo del Rocio' },
    { id: 100, nombre: 'Acevedo Collantes Byron Ramiro' },
    { id: 1321, nombre: 'Abendaño Anilema Bryan Jordan' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      solicitante: ['']
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      solicitante: '201 - Benavides Tates Maria Esthela'
    });
  }

  generar(): void {
    console.log('Detalle de Vacaciones de Empleado:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      solicitante: ''
    });
  }
}