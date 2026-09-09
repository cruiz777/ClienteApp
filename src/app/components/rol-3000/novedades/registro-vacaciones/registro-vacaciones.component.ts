import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-registro-vacaciones',
  templateUrl: './registro-vacaciones.component.html',
  styleUrls: ['./registro-vacaciones.component.css']
})
export class RegistroVacacionesComponent implements OnInit {
  form!: FormGroup;

  empleados = [
    { id: 201, nombre: 'Benavides Tates Maria Esthela' },
    { id: 116, nombre: 'Abata Bautista Amparo del Rocio' },
    { id: 100, nombre: 'Acevedo Collantes Byron Ramiro' }
  ];

  cargos = [
    'Auxiliar 1 - Aux. Diet. y Lava.',
    'Administradora',
    'Contadora',
    'Jefe de Área'
  ];

  autorizadores = [
    'Sofía Bastidas',
    'Mario Valencia',
    'Ana Pérez'
  ];

  aprobadores = [
    { id: 116, nombre: 'Abata Bautista Amparo del Rocio' },
    { id: 201, nombre: 'Benavides Tates Maria Esthela' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      documentoNo: [''],
      fecha: [''],
      empleado: [''],
      fechaIngreso: [''],
      codigoTrabajador: [''],
      departamento: [''],
      cedula: [''],
      cargoEmpleado: [''],

      diasAcumulados: [''],
      diasTomando: [''],
      saldoDias: [''],

      diasSolicitados: [''],
      fechaDesde: [''],
      fechaHasta: [''],
      fechaRetorno: [''],

      reemplazo: [''],

      usuarioAutoriza: [''],
      cargoAutoriza: [''],

      usuarioAprueba: [''],
      cargoAprueba: [''],

      observacion: ['']
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      documentoNo: '',
      fecha: '2025-09-29',
      empleado: '201 - Benavides Tates Maria Esthela',
      fechaIngreso: '2021-05-01',
      codigoTrabajador: '201',
      departamento: 'Dietética y Lavandería',
      cedula: '1001867858',
      cargoEmpleado: 'Auxiliar 1 - Aux. Diet. y Lava.',

      diasAcumulados: '30',
      diasTomando: '15',
      saldoDias: '15',

      diasSolicitados: '15',
      fechaDesde: '2025-09-30',
      fechaHasta: '2025-10-15',
      fechaRetorno: '2025-10-16',

      reemplazo: '',

      usuarioAutoriza: 'Sofía Bastidas',
      cargoAutoriza: 'Administradora',

      usuarioAprueba: '116 - Abata Bautista Amparo del Rocio',
      cargoAprueba: 'Contadora',

      observacion: '2 semanas de vacaciones....'
    });
  }

  aceptar(): void {
    console.log('Registro de Vacaciones:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}