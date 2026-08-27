import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface ProvisionRow {
  id: number;
  cedula: string;
  nombres: string;
  area: string;
  dias: number | null;
  sueldo: number | null;
  fechaIngreso1: string;
  fechaSalida1: string;
  fechaIngreso2: string;
  fechaSalida2: string;
}

@Component({
  selector: 'app-reporte-provisiones',
  templateUrl: './reporte-provisiones.component.html',
  styleUrls: ['./reporte-provisiones.component.css']
})
export class ReporteProvisionesComponent implements OnInit {
  form!: FormGroup;

  displayedColumns: string[] = [
    'id',
    'cedula',
    'nombres',
    'area',
    'dias',
    'sueldo',
    'fechaIngreso1',
    'fechaSalida1',
    'fechaIngreso2',
    'fechaSalida2'
  ];

  dataSource: ProvisionRow[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      periodoInicial: ['']
    });

    this.cargarMock();
  }

  cargarMock(): void {
    this.form.patchValue({
      periodoInicial: '2026-04-01'
    });

    this.dataSource = [
      {
        id: 1,
        cedula: '1312209966',
        nombres: 'Abril Macías José Francisco',
        area: 'Clínico',
        dias: 30,
        sueldo: 1000,
        fechaIngreso1: '01/04/2026',
        fechaSalida1: '',
        fechaIngreso2: '',
        fechaSalida2: ''
      },
      {
        id: 2,
        cedula: '1721864484',
        nombres: 'Abril Maza Lorena Viviana',
        area: 'Enfermería',
        dias: 30,
        sueldo: 1117,
        fechaIngreso1: '01/04/2026',
        fechaSalida1: '',
        fechaIngreso2: '',
        fechaSalida2: ''
      },
      {
        id: 3,
        cedula: '0201144946',
        nombres: 'Aguilar El Vitervo',
        area: 'Servicios',
        dias: 23,
        sueldo: 664,
        fechaIngreso1: '01/04/2026',
        fechaSalida1: '',
        fechaIngreso2: '',
        fechaSalida2: ''
      },
      {
        id: 4,
        cedula: '1723406524',
        nombres: 'Alarcón Figueroa Diego Patricio',
        area: 'Clínico',
        dias: 30,
        sueldo: 800,
        fechaIngreso1: '01/04/2026',
        fechaSalida1: '',
        fechaIngreso2: '',
        fechaSalida2: ''
      },
      {
        id: 5,
        cedula: '0201841707',
        nombres: 'Alban Martínez Wilson',
        area: 'Servicios',
        dias: 30,
        sueldo: 557,
        fechaIngreso1: '01/04/2026',
        fechaSalida1: '',
        fechaIngreso2: '',
        fechaSalida2: ''
      },
      {
        id: 6,
        cedula: '1709410490',
        nombres: 'Almache Pozo Sabina Esther',
        area: 'Clínico',
        dias: 30,
        sueldo: 685,
        fechaIngreso1: '01/04/2026',
        fechaSalida1: '',
        fechaIngreso2: '',
        fechaSalida2: ''
      },
      {
        id: 7,
        cedula: '0401664065',
        nombres: 'Almeida Coral Marcela del Socorro',
        area: 'Clínico',
        dias: 25,
        sueldo: 1060,
        fechaIngreso1: '01/04/2026',
        fechaSalida1: '',
        fechaIngreso2: '',
        fechaSalida2: ''
      },
      {
        id: 8,
        cedula: '1104752892',
        nombres: 'Alvarado Pullaguari Cecilia Yajaira',
        area: 'Farmacia',
        dias: 4,
        sueldo: 1200,
        fechaIngreso1: '01/04/2026',
        fechaSalida1: '',
        fechaIngreso2: '',
        fechaSalida2: ''
      }
    ];
  }

  aceptar(): void {
    console.log('Consultar reporte de provisiones:', this.form.value);
  }

  exportar(): void {
    console.log('Exportar reporte de provisiones');
  }

  cancelar(): void {
    this.form.reset({
      periodoInicial: ''
    });
  }
}