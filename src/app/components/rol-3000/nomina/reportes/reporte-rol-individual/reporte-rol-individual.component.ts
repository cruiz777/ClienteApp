import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-rol-individual',
  templateUrl: './reporte-rol-individual.component.html',
  styleUrls: ['./reporte-rol-individual.component.css']
})
export class ReporteRolIndividualComponent implements OnInit {
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
      opcion: ['']
    });
  }

  aceptar(): void {
    console.log('Generar reporte:', this.form.value);
  }

  enviarMail(): void {
    console.log('Enviar mail:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}