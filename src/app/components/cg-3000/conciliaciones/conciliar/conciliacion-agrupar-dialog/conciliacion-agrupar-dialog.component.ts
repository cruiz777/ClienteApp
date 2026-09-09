import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

interface AgruparItem {
  idDetMaestro: number;
  linea: number;
  fechatran: any;
  movbancario: string | null;
  nocomprobante: string | null;
  cheque: number;
  debito: number;
  credito: number;
  numdoc: string | null;
  beneficiario: string | null;
  tipdoc: string | null;
  concil: 'C' | 'N';
}

@Component({
  selector: 'app-conciliacion-agrupar-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTableModule,
  ],
  templateUrl: './conciliacion-agrupar-dialog.component.html',
  styleUrls: ['./conciliacion-agrupar-dialog.component.css'],
})
export class ConciliacionAgruparDialogComponent {
  displayedColumns: string[] = [
    'fechatran',
    'movbancario',
    'nocomprobante',
    'cheque',
    'debito',
    'credito',
    'check',
    'numdoc',
    'beneficiario',
    'tipdoc',
  ];

  items: AgruparItem[] = [];
  numcomp = '';

  totalDebitoMarcado = 0;
  totalCreditoMarcado = 0;

  constructor(
    private dialogRef: MatDialogRef<ConciliacionAgruparDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { numcomp: string; items: AgruparItem[] }
  ) {
    this.numcomp = data?.numcomp ?? '';
    this.items = (data?.items ?? []).map(x => ({ ...x }));
    this.recalcularTotales();
  }

  marcarTodo(): void {
    this.items.forEach(x => x.concil = 'C');
    this.recalcularTotales();
  }

  desmarcarTodo(): void {
    this.items.forEach(x => x.concil = 'N');
    this.recalcularTotales();
  }

  toggleItem(row: AgruparItem, checked: boolean): void {
    row.concil = checked ? 'C' : 'N';
    this.recalcularTotales();
  }

  aplicar(): void {
    this.dialogRef.close({
      updates: this.items.map(x => ({
        idDetMaestro: x.idDetMaestro,
        concil: x.concil,
      })),
    });
  }

  salir(): void {
    this.dialogRef.close();
  }

  private recalcularTotales(): void {
    this.totalDebitoMarcado = this.round2(
      this.items
        .filter(x => x.concil === 'C')
        .reduce((acc, x) => acc + this.toNum(x.debito), 0)
    );

    this.totalCreditoMarcado = this.round2(
      this.items
        .filter(x => x.concil === 'C')
        .reduce((acc, x) => acc + this.toNum(x.credito), 0)
    );
  }

  formatFecha(value: any): string {
    if (!value) return '';
    const dt = new Date(value);
    if (isNaN(dt.getTime())) return String(value);

    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
  }

  formatNum(value: any): string {
    return this.toNum(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private toNum(v: any): number {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private round2(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }
}