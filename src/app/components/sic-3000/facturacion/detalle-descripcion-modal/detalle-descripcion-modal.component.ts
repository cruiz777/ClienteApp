import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface DetalleDescripcionData {
  titulo?: string;
  descripcion: string;
  maxLen?: number;
}

@Component({
  selector: 'app-detalle-descripcion-modal',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule
  ],
  templateUrl: './detalle-descripcion-modal.component.html'
})
export class DetalleDescripcionModalComponent {
  ctrl = new FormControl<string>(this.data.descripcion ?? '');

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DetalleDescripcionData,
    private ref: MatDialogRef<DetalleDescripcionModalComponent, string>
  ) {}

  cancelar(): void {
    this.ref.close();                // no devuelve nada
  }

  aceptar(): void {
    const texto = (this.ctrl.value ?? '').trim();
    this.ref.close(texto);           // devuelve el nuevo texto
  }

  // Accesos rápidos
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') this.cancelar();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.aceptar();
  }
}
