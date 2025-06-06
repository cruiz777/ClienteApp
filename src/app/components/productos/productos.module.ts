import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; 

import { RouterModule } from '@angular/router';

// Componentes
import { NavigationProductoComponent } from './navigation-producto/navigation-producto.component';
import { BloqueComponent } from './bloque/bloque.component';

// Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

// Formularios
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Ag-Grid y Handsontable
import { HotTableModule } from '@handsontable/angular';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  declarations: [
    NavigationProductoComponent,
    BloqueComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
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
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  exports: [
    NavigationProductoComponent,
    BloqueComponent
  ]
})
export class ProductosModule {}
