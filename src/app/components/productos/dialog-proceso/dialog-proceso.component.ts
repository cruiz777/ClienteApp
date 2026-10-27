import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DialogProcesoData {
  procesados: number;
  total: number;
}

@Component({
  selector: 'app-dialog-proceso',
  templateUrl: './dialog-proceso.component.html',
  styleUrls: ['./dialog-proceso.component.css']
})
export class DialogProcesoComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogProcesoData,
    public dialogRef: MatDialogRef<DialogProcesoComponent>
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
