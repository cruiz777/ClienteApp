import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-solicitud-permiso',
  templateUrl: './solicitud-permiso.component.html',
  styleUrls: ['./solicitud-permiso.component.css']
})
export class SolicitudPermisoComponent implements OnInit {
  form!: FormGroup;

  empleados: string[] = [
    '1321 - ABENDAÑO ANILEMA BRYAN JORDAN',
    '1422 - ABRIL MACIAS JOSÉ FRANCISCO',
    '738 - ACARO PÉREZ CARMEN DELICIA',
    '100 - ACEVEDO COLLANTES BYRON RAMIRO'
  ];

  motivos: string[] = [
    'Calamidad doméstica',
    'Cita médica',
    'Asunto personal',
    'Vacación',
    'Permiso especial'
  ];

  aprobadores: string[] = [
    'Director General',
    'Jefe de Talento Humano',
    'Jefe de Área',
    'Supervisor'
  ];

  autorizadores: string[] = [
    'Talento Humano',
    'Gerencia',
    'Dirección Administrativa'
  ];

  tiposPermiso: string[] = [
    'Horas',
    'Día completo',
    'Medio día',
    'Permiso médico'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      empleado: [''],

      motivo: [''],
      numeroPermiso: [''],
      fechaDesde: [''],
      horaDesde: [''],
      fechaHasta: [''],
      horaHasta: [''],
      aprueba: [''],
      autoriza: [''],
      detalleGeneral: [''],

      tiempo: [''],
      horasDias: [''],
      detalleValidacion: [''],
      tipoPermiso: ['']
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      empleado: '1321 - ABENDAÑO ANILEMA BRYAN JORDAN',
      motivo: 'Asunto personal',
      numeroPermiso: 'PER-0001',
      fechaDesde: '2026-04-18',
      horaDesde: '08:00',
      fechaHasta: '2026-04-18',
      horaHasta: '12:30',
      aprueba: 'Jefe de Área',
      autoriza: 'Talento Humano',
      detalleGeneral: 'Permiso solicitado por trámite personal.',
      tiempo: '4:30',
      horasDias: 'Horas',
      detalleValidacion: 'Se descuenta del saldo de horas disponibles.',
      tipoPermiso: 'Horas'
    });
  }

  aceptar(): void {
    console.log('Solicitud de Permiso:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}