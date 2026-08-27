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
  ctrl = new FormControl<string>((this.data.descripcion ?? '').toUpperCase());

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
  // Fuerza MAYÚSCULAS mientras escribe
forceUppercase(ev: Event): void {
  const el = ev.target as HTMLTextAreaElement;
  const { selectionStart, selectionEnd, scrollTop } = el;
  const upper = (el.value ?? '').toUpperCase();

  if (el.value !== upper) {
    el.value = upper;
    this.ctrl.setValue(upper, { emitEvent: false });
    // restaura caret/scroll
    const start = selectionStart ?? upper.length;
    const end   = selectionEnd ?? upper.length;
    el.setSelectionRange(start, end);
    el.scrollTop = scrollTop ?? 0;
  }
}

// Asegura MAYÚSCULAS también al pegar
onPasteUpper(e: ClipboardEvent): void {
  e.preventDefault();
  const pasted = (e.clipboardData?.getData('text') || '').toUpperCase();

  const el = e.target as HTMLTextAreaElement;
  const start = el.selectionStart ?? el.value.length;
  const end   = el.selectionEnd ?? start;

  const before = (el.value ?? '').slice(0, start);
  const after  = (el.value ?? '').slice(end);
  const next   = before + pasted + after;

  el.value = next;
  this.ctrl.setValue(next, { emitEvent: true });

  const caret = start + pasted.length;
  requestAnimationFrame(() => el.setSelectionRange(caret, caret));
}

}
