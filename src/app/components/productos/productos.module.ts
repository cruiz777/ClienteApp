import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HotTableModule } from '@handsontable/angular';
import { AgGridModule } from 'ag-grid-angular';

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
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    NavigationProductoComponent,
    BloqueComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HotTableModule,
    FormsModule,
    AgGridModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatButtonModule,
    MatToolbarModule,
    MatTableModule
  ],
  exports: [
    NavigationProductoComponent,
    BloqueComponent
  ]
})
export class ProductosModule {}
