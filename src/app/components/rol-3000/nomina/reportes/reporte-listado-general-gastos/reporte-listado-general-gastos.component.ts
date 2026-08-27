import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reporte-listado-general-gastos',
  templateUrl: './reporte-listado-general-gastos.component.html',
  styleUrls: ['./reporte-listado-general-gastos.component.css']
})
export class ReporteListadoGeneralGastosComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      periodoInicial: [''],
      periodoFinal: [''],
      tipoListado: ['empleado'],
      incluirRolMensual: [false]
    });

    this.cargarMock();
  }

  cargarMock(): void {
    this.form.patchValue({
      periodoInicial: '2026-04-01',
      periodoFinal: '2026-04-30',
      tipoListado: 'empleado',
      incluirRolMensual: true
    });
  }

  aceptar(): void {
    console.log('Reporte Listado General y Gastos:', this.form.value);
  }

  cancelar(): void {
    this.form.reset({
      periodoInicial: '',
      periodoFinal: '',
      tipoListado: 'empleado',
      incluirRolMensual: false
    });
  }
}