import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-listado-fondos-reserva',
  templateUrl: './listado-fondos-reserva.component.html',
  styleUrls: ['./listado-fondos-reserva.component.css']
})
export class ListadoFondosReservaComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: ['']
    });

    this.cargarDatosPrueba();
  }

  cargarDatosPrueba(): void {
    this.form.patchValue({
      fecha: '2026-04-30'
    });
  }

  aceptar(): void {
    console.log('Listado de Fondos de Reserva:', this.form.value);
  }

  cancelar(): void {
    this.form.reset();
  }
}