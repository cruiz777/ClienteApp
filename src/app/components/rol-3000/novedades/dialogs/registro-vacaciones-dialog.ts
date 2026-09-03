import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PeriodoVacacionesResponse } from 'src/app/interfaces/responses/vacaciones.response';

import { VacacionesService } from 'src/app/services/rol/vacaciones-rol.service';


export interface PeriodosVacacionesDialogData {
  idEmpleado: number;
  nombreEmpleado: string;
}

@Component({
  selector: 'app-registro-vacaciones-dialog',
  templateUrl: './registro-vacaciones-dialog.html',
  styleUrls: ['./registro-vacaciones-dialog.css']
})
export class PeriodosVacacionesDialogComponent implements OnInit {
  periodos: PeriodoVacacionesResponse[] = [];
  cargando = false;

  displayedColumns: string[] = ['periodo', 'diasNormal', 'diasAdicional', 'diasTomados', 'diasDisponible'];

  constructor(
    private dialogRef: MatDialogRef<PeriodosVacacionesDialogComponent>,
    private vacacionesService: VacacionesService,
    @Inject(MAT_DIALOG_DATA) public data: PeriodosVacacionesDialogData
  ) {}

  ngOnInit(): void {
    this.cargando = true;

    this.vacacionesService.getPeriodos(this.data.idEmpleado).subscribe({
      next: periodos => {
        this.periodos = periodos ?? [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}