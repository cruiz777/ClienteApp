import { Component, OnInit } from '@angular/core';

interface RolNominaRow {
  id: number;
  cedula: string;
  codigo: number;
  trabajador: string;
  local: string;
  departamento: string;
  cargo: string;
  dias: number;
  sueldo: number;
  ingimp: number;
}

@Component({
  selector: 'app-reporte-rol-nomina',
  templateUrl: './reporte-rol-nomina.component.html',
  styleUrls: ['./reporte-rol-nomina.component.css']
})
export class ReporteRolNominaComponent implements OnInit {
  fechaInicial: string = '2026-04-01';
  fechaFinal: string = '2026-04-30';

  displayedColumns: string[] = [
    'id',
    'cedula',
    'codigo',
    'trabajador',
    'local',
    'departamento',
    'cargo',
    'dias',
    'sueldo',
    'ingimp'
  ];

  dataSource: RolNominaRow[] = [];
  private dataSourceOriginal: RolNominaRow[] = [];

  ngOnInit(): void {
    this.cargarMock();
  }

  cargarMock(): void {
    this.dataSourceOriginal = [
      {
        id: 1,
        cedula: '1312209966',
        codigo: 1422,
        trabajador: 'Abril Macías José Francisco',
        local: 'Clínico',
        departamento: 'Médicos General',
        cargo: 'Médico Emergencia',
        dias: 6,
        sueldo: 1000.00,
        ingimp: 452.27
      },
      {
        id: 2,
        cedula: '1721864484',
        codigo: 738,
        trabajador: 'Abril Maza Lorena Viviana',
        local: 'Clínico',
        departamento: 'Enfermería',
        cargo: 'Enfermería',
        dias: 30,
        sueldo: 1117.00,
        ingimp: 1338.63
      },
      {
        id: 3,
        cedula: '0201144946',
        codigo: 308,
        trabajador: 'Aguilar El Vitervo',
        local: 'Servicios',
        departamento: 'Guardianía',
        cargo: 'Guardia',
        dias: 23,
        sueldo: 664.00,
        ingimp: 833.00
      },
      {
        id: 4,
        cedula: '1723406524',
        codigo: 1415,
        trabajador: 'Alarcón Figueroa Diego Patricio',
        local: 'Clínico',
        departamento: 'Enfermería',
        cargo: 'Enfermero',
        dias: 30,
        sueldo: 800.00,
        ingimp: 1419.52
      },
      {
        id: 5,
        cedula: '0201841707',
        codigo: 737,
        trabajador: 'Alban Martínez Wilson',
        local: 'Servicios',
        departamento: 'Mantenimiento Ase',
        cargo: 'Auxiliar 1 - Aux. man.',
        dias: 30,
        sueldo: 557.00,
        ingimp: 703.98
      },
      {
        id: 6,
        cedula: '1709410490',
        codigo: 238,
        trabajador: 'Almache Pozo Sabina Esther',
        local: 'Clínico',
        departamento: 'Auxiliar de enferme',
        cargo: 'Auxiliar Enfermería',
        dias: 30,
        sueldo: 685.00,
        ingimp: 1086.97
      },
      {
        id: 7,
        cedula: '0401664065',
        codigo: 997,
        trabajador: 'Almeida Coral Marcela del Socorro',
        local: 'Clínico',
        departamento: 'Enfermería',
        cargo: 'Enfermería',
        dias: 25,
        sueldo: 1060.00,
        ingimp: 1441.32
      },
      {
        id: 8,
        cedula: '1104752892',
        codigo: 1381,
        trabajador: 'Alvarado Pullaguari Cecilia Yajaira',
        local: 'Clínico',
        departamento: 'Farmacia',
        cargo: 'Jefe de Farmacia',
        dias: 4,
        sueldo: 1200.00,
        ingimp: 193.74
      },
      {
        id: 9,
        cedula: '1723653489',
        codigo: 857,
        trabajador: 'Amangandi HurtadoAndrea Maricela',
        local: 'Clínico',
        departamento: 'Auxiliar Enfermería',
        cargo: 'Auxiliar Enfermería',
        dias: 30,
        sueldo: 565.00,
        ingimp: 787.72
      }
    ];

    this.dataSource = [...this.dataSourceOriginal];
  }

  consultar(): void {
    if (!this.fechaInicial || !this.fechaFinal) {
      console.warn('Debe ingresar ambas fechas.');
      return;
    }

    const inicio = new Date(this.fechaInicial);
    const fin = new Date(this.fechaFinal);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      console.warn('Las fechas no son válidas.');
      return;
    }

    if (inicio > fin) {
      console.warn('La fecha inicial no puede ser mayor a la fecha final.');
      return;
    }

    // Aquí iría la llamada real al backend.
    // Por ahora solo recargamos mock.
    this.dataSource = [...this.dataSourceOriginal];
    console.log('Consultar reporte con rango:', {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal
    });
  }

  exportar(): void {
    // Aquí luego conectas exportación real a Excel/PDF
    console.log('Exportar reporte:', this.dataSource);
  }
}