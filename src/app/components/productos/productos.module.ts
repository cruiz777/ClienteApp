import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Componentes
import { NavigationProductoComponent } from './navigation-producto/navigation-producto.component';
import { BloqueComponent } from './bloque/bloque.component';
import { MatOptionModule } from '@angular/material/core';


// Angular Material modules necesarios

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';


// Ag-Grid y Handsontable
import { HotTableModule } from '@handsontable/angular';
import { AgGridModule } from 'ag-grid-angular';


@NgModule({
  declarations: [
    NavigationProductoComponent,
    GlnComponent,
    BloqueComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    HotTableModule,
    AgGridModule,
    FormsModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatButtonModule,
    MatToolbarModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatOptionModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatOptionModule,
    MatSelectModule
  ],
  exports: [
    NavigationProductoComponent,
    BloqueComponent
  ]
})
export class ProductosModule {}
