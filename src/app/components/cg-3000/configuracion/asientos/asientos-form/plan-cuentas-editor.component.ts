// src/app/asientos/asientos-form/plan-cuentas-editor.component.ts
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';
import { PlanCuentasDialogComponent, CuentaPlan } from './plan-cuentas-dialog.component';

@Component({
  selector: 'app-plan-cuentas-editor',
  template: `
    <div class="editor-wrap">
      <mat-form-field appearance="fill" class="w100">
        <input matInput [(ngModel)]="display" (keydown.enter)="onEnter()" placeholder="Código de cuenta">
        <button mat-icon-button matSuffix (click)="abrirDialogo()" tabindex="-1">
          <mat-icon>search</mat-icon>
        </button>
      </mat-form-field>
    </div>
  `,
  styles: [`.editor-wrap{width:380px;padding:6px}.w100{width:100%}`]
})
export class PlanCuentasEditorComponent implements ICellEditorAngularComp {
  private params!: ICellEditorParams;
  display = '';

  constructor(private dialog: MatDialog) {}

  agInit(params: ICellEditorParams): void {
    this.params = params;
    this.display = (params.value ?? '').toString();
  }
  getValue() { return this.display; }
  isPopup(): boolean { return true; }
  onEnter() { this.params.stopEditing(); }

  abrirDialogo() {
    const ref = this.dialog.open(PlanCuentasDialogComponent, { width: '760px', data: { filtro: this.display } });
    ref.afterClosed().subscribe((sel: CuentaPlan | undefined) => {
      if (sel) {
        this.params.node.setDataValue('cuentaId', sel.id);
        this.params.node.setDataValue('codigo', sel.codigo);
        this.params.node.setDataValue('descripcionCuenta', sel.descripcion);
        this.display = `${sel.codigo}. ${sel.descripcion}`;
      }
      this.params.stopEditing();
    });
  }
}
