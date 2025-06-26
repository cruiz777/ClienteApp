import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-observacion-dialog',
  template: `
    <h2 mat-dialog-title>Observación</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>Ingrese la observación</mat-label>
        <textarea matInput [(ngModel)]="data.observacion" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-button color="primary" (click)="confirmar()" cdkFocusInitial>Aceptar</button>
    </mat-dialog-actions>
  `
})
export class ObservacionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ObservacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { observacion: string }
  ) {}

  cancelar(): void {
    this.dialogRef.close();
  }

  confirmar(): void {
    this.dialogRef.close(this.data.observacion);
  }
}
