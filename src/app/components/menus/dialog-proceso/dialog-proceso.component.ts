import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface DialogProcesoData {
  titulo: string;
  subtitulo?: string;
  pasos?: string[];     // líneas de texto
}

@Component({
  selector: 'app-dialog-proceso',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './dialog-proceso.component.html',
  styleUrls: ['./dialog-proceso.component.css']
})
export class DialogProcesoComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogProcesoData) {}
}
