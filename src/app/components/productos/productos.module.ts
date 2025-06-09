import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; 

import { RouterModule } from '@angular/router';

// Componentes
import { NavigationProductoComponent } from './navigation-producto/navigation-producto.component';
import { BloqueComponent } from './bloque/bloque.component';
import { MatOptionModule } from '@angular/material/core';

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
import { MatSelectModule } from '@angular/material/select';

import { CheckboxRendererComponent } from './checkbox-renderer/checkbox-renderer.component';

// Formularios
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Ag-Grid y Handsontable
import { HotTableModule } from '@handsontable/angular';
import { AgGridModule } from 'ag-grid-angular';
import { AgGridAngular } from 'ag-grid-angular';


@NgModule({
  declarations: [
    NavigationProductoComponent,
    BloqueComponent,
    CheckboxRendererComponent
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
