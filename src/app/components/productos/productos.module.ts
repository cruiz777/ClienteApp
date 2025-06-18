import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

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
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { CheckboxRendererComponent } from './checkbox-renderer/checkbox-renderer.component';
import { GcpBrickAutocompleteEditorComponent } from './gcp-brick-autocomplete-editor/gcp-brick-autocomplete-editor.component';

// Formularios
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Ag-Grid y Handsontable
import { HotTableModule } from '@handsontable/angular';
import { AgGridModule } from 'ag-grid-angular';
import { AgGridAngular } from 'ag-grid-angular';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DialogProcesoComponent } from './dialog-proceso/dialog-proceso.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { GlnComponent } from './glns/gln-list/nuevo-gln.component';


@NgModule({
  declarations: [
    NavigationProductoComponent,
    GlnComponent,
    BloqueComponent,
    CheckboxRendererComponent,
    GcpBrickAutocompleteEditorComponent,
    DialogProcesoComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    // Angular Material necesarios
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
    MatAutocompleteModule,
    SharedModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    MatOptionModule,
    MatSelectModule,
    AgGridAngular,
    MatProgressBarModule,
    MatAutocompleteModule
  ],
  exports: [
    NavigationProductoComponent,
    BloqueComponent
  ]
})
export class ProductosModule {}
