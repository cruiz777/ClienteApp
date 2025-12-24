import { Component } from '@angular/core';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PlanCuentaCellEditorParams extends ICellEditorParams {
  cuentas: Array<{ id: number; label: string; codigo: string }>;
}

@Component({
  selector: 'app-plan-cuenta-cell-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select
      [(ngModel)]="selectedId"
      (change)="onChange()"
      class="form-select"
      style="width: 100%; height: 100%; border: 2px solid #1976d2; padding: 4px;">
      <option [value]="0">-- Seleccione cuenta --</option>
      <option *ngFor="let c of cuentas" [value]="c.id">
        {{ c.label }}
      </option>
    </select>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class PlanCuentaCellEditorComponent implements ICellEditorAngularComp {
  params!: PlanCuentaCellEditorParams;
  selectedId: number = 0;
  cuentas: Array<{ id: number; label: string; codigo: string }> = [];

  agInit(params: PlanCuentaCellEditorParams): void {
    this.params = params;
    this.cuentas = params.cuentas || [];
    this.selectedId = Number(params.value) || 0;
  }

  getValue(): number {
    return this.selectedId;
  }

  onChange(): void {
    this.params.stopEditing();
  }
}
