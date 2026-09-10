import { Component, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ImprimirVacacionesDialogData {
  textoPreview: string;
}

@Component({
  selector: 'app-imprimir-vacaciones-dialog',
  templateUrl: './imprimir-vacaciones-dialog.component.html',
  styleUrls: ['./imprimir-vacaciones-dialog.component.css']
})
export class ImprimirVacacionesDialogComponent {
  // Editable solo como referencia visual para el usuario — el PDF real lo arma el back
  textoCtrl = new FormControl(this.data.textoPreview);

  constructor(
    private dialogRef: MatDialogRef<ImprimirVacacionesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImprimirVacacionesDialogData
  ) {}

  continuar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
