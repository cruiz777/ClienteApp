import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-ingreso-descuentos-empleado',
  templateUrl: './reporte-ingreso-descuentos-empleado.component.html',
  styleUrls: ['./reporte-ingreso-descuentos-empleado.component.css']
})
export class ReporteIngresoDescuentosEmpleadoComponent implements OnInit {
  form!: FormGroup;

  codigos = [
    { id: '001', descripcion: 'Sueldo' },
    { id: '002', descripcion: 'Horas Extras' },
    { id: '003', descripcion: 'Bonificación' },
    { id: '101', descripcion: 'Anticipo' },
    { id: '102', descripcion: 'IESS' }
  ];

  periodos = [
    '2025-01',
    '2025-02',
    '2025-03',
    '2025-04',
    '2025-05'
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      tipoMovimiento: ['ingreso'],
      codigo: [''],
      periodo: [''],
      ingImputables: [false],
      egresos: [false],
      temporal: [false],
      fijos: [false],
      exempleado: [false],
      porHoras: [false],
      honorarios: [false]
    });

    this.cargarMock();
  }

  cargarMock(): void {
    this.form.patchValue({
      tipoMovimiento: 'ingreso',
      codigo: '001',
      periodo: '2025-04',
      ingImputables: true,
      egresos: false,
      temporal: false,
      fijos: true,
      exempleado: false,
      porHoras: false,
      honorarios: false
    });
  }

  aceptar(): void {
    console.log('Reporte Ingreso Descuentos por Empleado:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      tipoMovimiento: 'ingreso',
      codigo: '',
      periodo: '',
      ingImputables: false,
      egresos: false,
      temporal: false,
      fijos: false,
      exempleado: false,
      porHoras: false,
      honorarios: false
    });
  }
}