import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-empleados-excluidos-nomina-actual',
  templateUrl: './empleados-excluidos-nomina-actual.component.html',
  styleUrls: ['./empleados-excluidos-nomina-actual.component.css']
})
export class EmpleadosExcluidosNominaActualComponent implements OnInit {
  form!: FormGroup;

  tiposNomina = [
    { id: 1, nombre: 'Nómina Quincenal' },
    { id: 2, nombre: 'Nómina Mensual' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      tipoNomina: ['']
    });

    this.cargarMock();
  }

  cargarMock(): void {
    this.form.patchValue({
      tipoNomina: 1
    });
  }

  aceptar(): void {
    console.log('Empleados excluidos en nómina actual:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      tipoNomina: ''
    });
  }
}