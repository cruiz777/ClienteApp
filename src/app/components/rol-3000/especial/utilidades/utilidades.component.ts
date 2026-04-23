import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface UtilidadDetalle {
  local: string;
  afiliacion: number;
  sector: string;
  cedula: string;
  nombre: string;
  conyuge: number;
  hijos: number;
  dias: number;
  fechaIngreso: string;
  fechaSalida: string;
  alicuotaEmpleado: number;
  alicuotaCarga: number;
}

@Component({
  selector: 'app-utilidades',
  templateUrl: './utilidades.component.html',
  styleUrls: ['./utilidades.component.css']
})
export class UtilidadesComponent implements OnInit {

  form!: FormGroup;

  data: UtilidadDetalle[] = [];

  resumen = {
    subtotalEmpleado: 0,
    subtotalCarga: 0,
    numeroCargas: 0,
    numeroDias: 0
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      periodo: [''],
      porcentajeEmpleado: [10],
      porcentajeCarga: [5],

      tipoEmpleado: this.fb.group({
        temporal: [false],
        becarios: [false],
        exEmpleados: [false],
        fijos: [true],
        horas: [false],
        honorarios: [false]
      })
    });

    this.mock();
  }

  mock() {
    this.data = [
      {
        local: 'Administrativo',
        afiliacion: 1,
        sector: '0000000028',
        cedula: '1716851714',
        nombre: 'Empleado Demo',
        conyuge: 1,
        hijos: 2,
        dias: 360,
        fechaIngreso: '01/01/2020',
        fechaSalida: '',
        alicuotaEmpleado: 100,
        alicuotaCarga: 50
      }
    ];
  }

  calcular() {
    this.resumen.subtotalEmpleado = this.data.reduce(
      (a, b) => a + b.alicuotaEmpleado,
      0
    );

    this.resumen.subtotalCarga = this.data.reduce(
      (a, b) => a + b.alicuotaCarga,
      0
    );

    this.resumen.numeroCargas = this.data.reduce(
      (a, b) => a + b.hijos + b.conyuge,
      0
    );

    this.resumen.numeroDias = this.data.reduce(
      (a, b) => a + b.dias,
      0
    );
  }

  grabar() {
    console.log('GRABAR UTILIDADES');
  }

  exportar() {
    console.log('EXPORTAR UTILIDADES');
  }

  cancelar() {
    this.ngOnInit();
  }

  money(v: number) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }
}