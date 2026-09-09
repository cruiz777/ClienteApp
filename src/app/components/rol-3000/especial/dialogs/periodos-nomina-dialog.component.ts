import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { PeriodoNominaResponse } from 'src/app/interfaces/responses/periodo-nomina-response';
import { CustomMessageBoxComponent, MessageBoxData } from 'src/app/components/utils/messages/custom-message-box.component';
import { DecimosService } from 'src/app/services/rol/decimos.service';

export interface PeriodosNominaDialogData {
  numPatronal: string;
  idTipoNomEsp: number;
}

export interface PeriodosNominaDialogResult {
  seleccionado: PeriodoNominaResponse;
}

@Component({
  selector: 'app-periodos-nomina-dialog',
  templateUrl: './periodos-nomina-dialog.component.html',
  styleUrls: ['./periodos-nomina-dialog.component.css']
})
export class PeriodosNominaDialogComponent implements OnInit {

  periodos: PeriodoNominaResponse[] = [];
  cargando = false;

  displayedColumns = ['periodo', 'tipoNomina', 'regimen', 'cantidadEmpleados', 'totalLiquido', 'acciones'];

  constructor(
    private dialogRef: MatDialogRef<PeriodosNominaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PeriodosNominaDialogData,
    private decimosService: DecimosService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.cargando = true;
    this.decimosService.getPeriodos(this.data.numPatronal).subscribe({
      next: (resp) => {
        // Filtrar solo los del tipo de nómina actual
        this.periodos = (resp.data ?? []).filter(
          p => p.idTipoNomEsp === this.data.idTipoNomEsp
        );
        this.cargando = false;
      },
      error: () => this.cargando = false
    });
  }

  seleccionar(periodo: PeriodoNominaResponse): void {
    this.dialogRef.close({ seleccionado: periodo });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  formatMoneda(value: number): string {
    return '$' + Number(value ?? 0).toFixed(2);
  }
}