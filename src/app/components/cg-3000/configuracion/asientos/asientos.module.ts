// src/app/asientos/asientos.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AgGridModule } from 'ag-grid-angular';

import { AsientoFormComponent } from './asientos-form/asiento-form.component';
import { SesionCaducadaDialog } from './asientos-form/sesion-caducada.dialog';
import { PlanCuentasDialogComponent } from './asientos-form/plan-cuentas-dialog.component';
import { PlanCuentasEditorComponent } from './asientos-form/plan-cuentas-editor.component';

@NgModule({
  declarations: [
    AsientoFormComponent,
    SesionCaducadaDialog,
    PlanCuentasDialogComponent,
    PlanCuentasEditorComponent,
  ],
  imports: [
    CommonModule,
    FormsModule, ReactiveFormsModule, HttpClientModule,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatTabsModule, MatCheckboxModule, MatDialogModule,
    MatListModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    AgGridModule,
  ],
  exports: [AsientoFormComponent]
})
export class AsientosModule {}
