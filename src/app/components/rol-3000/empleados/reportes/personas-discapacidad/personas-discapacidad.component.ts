import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-personas-discapacidad',
  templateUrl: './personas-discapacidad.component.html',
  styleUrls: ['./personas-discapacidad.component.css']
})
export class PersonasDiscapacidadComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      activos: [true],
      exempleados: [false]
    });
  }

  aceptar(): void {
    console.log('Reporte Personas con Discapacidad:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      activos: false,
      exempleados: false
    });
  }
}