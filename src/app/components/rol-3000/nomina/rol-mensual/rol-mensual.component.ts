import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface NodoRol {
  id: number;
  nombre: string;
}

interface RolDetalle {
  codigo: number;
  nombre: string;
  estado: string;
  diasTrabajados: number | null;
  sueldo: number | null;
  maternidad: number | null;
  recargoNocturno: number | null;
  horasExtras25: number | null;
  horasExtras50: number | null;
  horasExtras100: number | null;
}

@Component({
  selector: 'app-rol-mensual',
  templateUrl: './rol-mensual.component.html',
  styleUrls: ['./rol-mensual.component.css']
})
export class RolMensualComponent implements OnInit {
  form!: FormGroup;

  nodos: NodoRol[] = [];
  nodoSeleccionadoId: number | null = null;

  displayedColumns: string[] = [
    'codigo',
    'nombre',
    'estado',
    'diasTrabajados',
    'sueldo',
    'maternidad',
    'recargoNocturno',
    'horasExtras25',
    'horasExtras50',
    'horasExtras100'
  ];

  detalleRol: RolDetalle[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      verLocales: [false],
      areas: [true],
      exEmpleados: [true],
      departamentos: [false],
      fechaPeriodo: [''],

      totalizados: [false],
      porRubros: [false],
      todosLosRubros: [true],
      totalizar: [false]
    });

    this.cargarMock();
  }

  cargarMock(): void {
    this.form.patchValue({
      fechaPeriodo: '2025-09-01'
    });

    this.nodos = [
      { id: 1, nombre: 'Emisión de Roles' }
    ];

    this.detalleRol = [
      {
        codigo: 562,
        nombre: 'Yapez Espinosa María Georidla',
        estado: '',
        diasTrabajados: null,
        sueldo: null,
        maternidad: null,
        recargoNocturno: null,
        horasExtras25: null,
        horasExtras50: null,
        horasExtras100: null
      },
      {
        codigo: 23,
        nombre: 'Yapez Espinosa de los',
        estado: '',
        diasTrabajados: null,
        sueldo: null,
        maternidad: null,
        recargoNocturno: null,
        horasExtras25: null,
        horasExtras50: null,
        horasExtras100: null
      },
      {
        codigo: 330,
        nombre: 'Yapez Marín Luis Eduardo',
        estado: '',
        diasTrabajados: null,
        sueldo: null,
        maternidad: null,
        recargoNocturno: null,
        horasExtras25: null,
        horasExtras50: null,
        horasExtras100: null
      },
      {
        codigo: 872,
        nombre: 'Yugsiñena Toapanta Johaira',
        estado: '',
        diasTrabajados: 565,
        sueldo: 565,
        maternidad: null,
        recargoNocturno: 56.5,
        horasExtras25: null,
        horasExtras50: null,
        horasExtras100: null
      },
      {
        codigo: 341,
        nombre: 'Zambrano Ponce Cristóbal',
        estado: '',
        diasTrabajados: null,
        sueldo: null,
        maternidad: null,
        recargoNocturno: null,
        horasExtras25: null,
        horasExtras50: null,
        horasExtras100: null
      },
      {
        codigo: 105,
        nombre: 'Zapata Carmen Magdalena',
        estado: '',
        diasTrabajados: null,
        sueldo: null,
        maternidad: null,
        recargoNocturno: null,
        horasExtras25: null,
        horasExtras50: null,
        horasExtras100: null
      },
      {
        codigo: 256,
        nombre: 'Zapata Cesárea Jory',
        estado: '',
        diasTrabajados: null,
        sueldo: null,
        maternidad: null,
        recargoNocturno: null,
        horasExtras25: null,
        horasExtras50: null,
        horasExtras100: null
      },
      {
        codigo: 33,
        nombre: 'Zarate Véliz Victoria',
        estado: '',
        diasTrabajados: null,
        sueldo: null,
        maternidad: null,
        recargoNocturno: null,
        horasExtras25: null,
        horasExtras50: null,
        horasExtras100: null
      }
    ];
  }

  seleccionarNodo(nodo: NodoRol): void {
    this.nodoSeleccionadoId = nodo.id;
  }

  nuevo(): void {
    console.log('Nuevo');
  }

  actualizar(): void {
    console.log('Actualizar', this.form.value);
  }

  cargarHoras(): void {
    console.log('Cargar Horas');
  }

  rubrosFijos(): void {
    console.log('Rubros Fijos');
  }

  cancelar(): void {
    console.log('Cancelar');
  }

  calcularTotal(columna: keyof RolDetalle): number {
    return this.detalleRol.reduce((acc, item) => {
      const valor = item[columna];
      return acc + (typeof valor === 'number' ? valor : 0);
    }, 0);
  }
}