import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-listado-general',
  templateUrl: './reporte-listado-general.component.html',
  styleUrls: ['./reporte-listado-general.component.css']
})
export class ReporteListadoGeneralComponent implements OnInit {
  form!: FormGroup;

  areas: string[] = [
    'Clínico',
    'Administrativo',
    'Servicios',
    'Enfermería'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      periodoInicial: [''],
      periodoFinal: [''],
      empleado: [''],
      areaInicial: [''],
      areaFinal: [''],
      opcion: [''],
      tipoListado: ['areas']
    });
  }

  aceptar(): void {
    console.log('Generar reporte:', this.form.value);
  }

  enviarMail(): void {
    console.log('Enviar mail:', this.form.value);
  }

  guardarBanco(): void {
    console.log('Guardar banco');
  }

  listadoBanco(): void {
    console.log('Listado banco');
  }

  cancelar(): void {
    this.form.reset();
  }
}