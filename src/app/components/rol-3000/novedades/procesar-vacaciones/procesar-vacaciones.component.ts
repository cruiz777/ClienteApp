import { Component, OnInit } from '@angular/core';

interface VacacionPendiente {
  id: number;
  codEm: number;
  fechaIngreso: string;
  anios: number;
  meses: number;
  dias: number;
}

interface VacacionProcesada {
  id: number;
  codEm: number;
  fechaIngreso: string;
  periodo: string;
  total: number;
  nom: number;
}

@Component({
  selector: 'app-procesar-vacaciones',
  templateUrl: './procesar-vacaciones.component.html',
  styleUrls: ['./procesar-vacaciones.component.css']
})
export class ProcesarVacacionesComponent implements OnInit {
  displayedColumnsIzquierda: string[] = [
    'id',
    'codEm',
    'fechaIngreso',
    'anios',
    'meses',
    'dias'
  ];

  displayedColumnsDerecha: string[] = [
    'id',
    'codEm',
    'fechaIngreso',
    'periodo',
    'total',
    'nom'
  ];

  vacacionesPendientes: VacacionPendiente[] = [];
  vacacionesProcesadas: VacacionProcesada[] = [];

  ngOnInit(): void {
    this.cargarDatosMock();
  }

  cargarDatosMock(): void {
    this.vacacionesPendientes = [
      { id: 1, codEm: 1449, fechaIngreso: '09/06/2025', anios: 0, meses: 3, dias: 20 },
      { id: 2, codEm: 1450, fechaIngreso: '09/06/2025', anios: 0, meses: 3, dias: 20 },
      { id: 3, codEm: 1453, fechaIngreso: '17/07/2025', anios: 0, meses: 2, dias: 12 },
      { id: 4, codEm: 1007, fechaIngreso: '02/08/2017', anios: 8, meses: 1, dias: 27 },
      { id: 5, codEm: 104, fechaIngreso: '01/03/1995', anios: 30, meses: 6, dias: 28 }
    ];

    this.vacacionesProcesadas = [
      { id: 1, codEm: 1449, fechaIngreso: '09/06/2025', periodo: '2024-2025', total: 0, nom: 0 },
      { id: 2, codEm: 1450, fechaIngreso: '09/06/2025', periodo: '2024-2025', total: 3.75, nom: 3.75 },
      { id: 3, codEm: 1453, fechaIngreso: '17/07/2025', periodo: '2024-2025', total: 0, nom: 0 },
      { id: 4, codEm: 1007, fechaIngreso: '02/08/2017', periodo: '2025-2026', total: 1.5, nom: 1.5 },
      { id: 5, codEm: 1010, fechaIngreso: '02/08/2017', periodo: '2024-2025', total: 18, nom: 15 }
    ];
  }

  refrescarVacaciones(): void {
    console.log('Refrescando vacaciones...');
    this.cargarDatosMock();
  }
}