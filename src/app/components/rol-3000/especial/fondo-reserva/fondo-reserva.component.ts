import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface FondoReservaDetalle {
  posicion: number;
  local: string;
  noAfiliacion: number;
  cedula: string;
  codSectorial: string;
  nombre: string;
  numeroDias: number;
  fondoReserva: number;
  fechaIng: string;
  fechaSal: string;
  observacion: string;
}

@Component({
  selector: 'app-fondo-reserva',
  templateUrl: './fondo-reserva.component.html',
  styleUrls: ['./fondo-reserva.component.css']
})
export class FondoReservaComponent implements OnInit {

  form!: FormGroup;

  dataSource: FondoReservaDetalle[] = [];

  resumen = {
    total: 0
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      patronal: ['', Validators.required],
      sucursal: ['1'],
      empresa: ['', Validators.required],
      periodo: ['', Validators.required],
      tipoEmpleado: [''],
      region: [''],
      desde: [''],
      hasta: ['']
    });

    this.cargarMock();
  }

  cargarMock() {
    this.dataSource = [
      {
        posicion: 1,
        local: 'Administrativo',
        noAfiliacion: 1,
        cedula: '1716851714',
        codSectorial: '0000000028',
        nombre: 'Empleado Ejemplo',
        numeroDias: 360,
        fondoReserva: 100,
        fechaIng: '01/01/2020',
        fechaSal: '',
        observacion: ''
      }
    ];
  }

  calcular() {
    this.resumen.total = this.dataSource.reduce(
      (acc, x) => acc + x.fondoReserva,
      0
    );
  }

  grabar() {
    console.log('GRABAR FONDO RESERVA');
  }

  exportar() {
    console.log('EXPORTAR');
  }

  cancelar() {
    this.form.reset();
    this.cargarMock();
  }

  money(v: number) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }
}