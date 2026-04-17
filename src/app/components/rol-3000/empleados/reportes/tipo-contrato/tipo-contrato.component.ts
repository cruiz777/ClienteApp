import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface TipoContratoEmpleado {
  secuencia: number;
  codigo: number;
  cedula: string;
  nombre: string;
  cargo: string;
  tipoContrato: string;
  fechaInicial: string;
}

@Component({
  selector: 'app-tipo-contrato',
  templateUrl: './tipo-contrato.component.html',
  styleUrls: ['./tipo-contrato.component.css']
})
export class TipoContratoComponent implements OnInit {
  form!: FormGroup;

  displayedColumns: string[] = [
    'secuencia',
    'codigo',
    'cedula',
    'nombre',
    'cargo',
    'tipoContrato',
    'fechaInicial'
  ];

  empleados: TipoContratoEmpleado[] = [];
  empleadosFiltrados: TipoContratoEmpleado[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      buscarNombre: ['']
    });

    this.cargarMock();
    this.filtrar();

    this.form.get('buscarNombre')?.valueChanges.subscribe(() => {
      this.filtrar();
    });
  }

  cargarMock(): void {
    this.empleados = [
      {
        secuencia: 2,
        codigo: 1321,
        cedula: '1721532513',
        nombre: 'Abendaño Anilema Bryan Jordan',
        cargo: 'Tecnologo',
        tipoContrato: '01 - A Prueba Tiempo Completo',
        fechaInicial: '02/06/2020'
      },
      {
        secuencia: 3,
        codigo: 1422,
        cedula: '1312209966',
        nombre: 'Abril Macias José Francisco',
        cargo: 'Médico Emergenciólogo',
        tipoContrato: '01 - A Prueba Tiempo Completo',
        fechaInicial: '21/12/2019'
      },
      {
        secuencia: 4,
        codigo: 738,
        cedula: '1721864484',
        nombre: 'Acaro Pérez Carmen Delicia',
        cargo: 'Directora General',
        tipoContrato: '06 - Indefinido Tiempo Completo',
        fechaInicial: '01/04/2021'
      },
      {
        secuencia: 5,
        codigo: 100,
        cedula: '1102765177',
        nombre: 'Acevedo Collantes Byron Ramiro',
        cargo: 'Directora General',
        tipoContrato: '06 - Indefinido Tiempo Completo',
        fechaInicial: '01/10/2019'
      },
      {
        secuencia: 6,
        codigo: 737,
        cedula: '0201841707',
        nombre: 'Alban Martínez Wilson',
        cargo: 'Auxiliar 1 - Aux. Mant. Aseo',
        tipoContrato: '06 - Indefinido Tiempo Completo',
        fechaInicial: '26/03/2022'
      }
    ];
  }

  filtrar(): void {
    const texto = (this.form.get('buscarNombre')?.value || '').toLowerCase().trim();

    if (!texto) {
      this.empleadosFiltrados = [...this.empleados];
      return;
    }

    this.empleadosFiltrados = this.empleados.filter(item =>
      item.nombre.toLowerCase().includes(texto)
    );
  }
} 