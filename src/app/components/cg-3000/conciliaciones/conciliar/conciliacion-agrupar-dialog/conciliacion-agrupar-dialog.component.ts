import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

export interface AgruparItem {
  idDetMaestro: number;
  fechatran?: string | null;
  movbancario?: string | null;
  cheque?: number | null;
  debito?: number | null;
  credito?: number | null;
  beneficiario?: string | null;
  concil: 'S' | 'N';
}

export interface AgruparDialogData {
  numcomp: string;
  items: AgruparItem[];
}

@Component({
  standalone: true,
  selector: 'app-conciliacion-agrupar-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatDividerModule],
  template: `
    <h2 mat-dialog-title>Agrupar por comprobante: {{ data.numcomp }}</h2>

    <div mat-dialog-content>
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
        <button mat-stroked-button (click)="marcarTodos()">Marcar todos</button>
        <button mat-stroked-button (click)="desmarcarTodos()">Desmarcar todos</button>
        <span style="flex:1 1 auto;"></span>
        <b>Total Débito:</b> {{ totalDebito | number:'1.2-2' }}
        <b>Total Crédito:</b> {{ totalCredito | number:'1.2-2' }}
      </div>

      <mat-divider></mat-divider>

      <div style="max-height:55vh; overflow:auto; padding-top:10px;">
        <div *ngFor="let it of items"
             style="display:grid; grid-template-columns: 40px 140px 80px 110px 110px 1fr; gap:10px; align-items:center; padding:6px 0;">
          <mat-checkbox [checked]="it.concil === 'S'" (change)="onToggle(it, $event.checked)"></mat-checkbox>
          <div>{{ it.fechatran || '' }}</div>
          <div>{{ it.movbancario || '' }}</div>
          <div style="text-align:right;">{{ (it.debito ?? 0) | number:'1.2-2' }}</div>
          <div style="text-align:right;">{{ (it.credito ?? 0) | number:'1.2-2' }}</div>
          <div>{{ it.beneficiario || '' }}</div>
        </div>
      </div>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="cancel()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="ok()">Aplicar</button>
    </div>
  `,
})
export class ConciliacionAgruparDialogComponent {
  items: AgruparItem[] = [];
  totalDebito = 0;
  totalCredito = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AgruparDialogData,
    private ref: MatDialogRef<ConciliacionAgruparDialogComponent>
  ) {
    this.items = (data?.items ?? []).map(x => ({ ...x }));
    this.recalc();
  }

  private n(v: any): number {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private recalc() {
    this.totalDebito = this.items.reduce((a, x) => a + this.n(x.debito), 0);
    this.totalCredito = this.items.reduce((a, x) => a + this.n(x.credito), 0);
  }

  onToggle(it: AgruparItem, checked: boolean) {
    it.concil = checked ? 'S' : 'N';
  }

  marcarTodos() {
    for (const it of this.items) it.concil = 'S';
  }

  desmarcarTodos() {
    for (const it of this.items) it.concil = 'N';
  }

  cancel() {
    this.ref.close(null);
  }

  ok() {
    this.ref.close({
      updates: this.items.map(x => ({ idDetMaestro: x.idDetMaestro, concil: x.concil })),
    });
  }
}