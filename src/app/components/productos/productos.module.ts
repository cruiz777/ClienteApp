import { NgModule, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Componentes personalizados
import { NavigationProductoComponent } from './navigation-producto/navigation-producto.component';
import { BloqueComponent } from './bloque/bloque.component';
import { GlnComponent } from './glns/gln-list/nuevo-gln.component';
import { CheckboxRendererComponent } from './checkbox-renderer/checkbox-renderer.component';
import { GcpBrickAutocompleteEditorComponent } from './gcp-brick-autocomplete-editor/gcp-brick-autocomplete-editor.component';
import { DialogProcesoComponent } from './dialog-proceso/dialog-proceso.component';
import { ObservacionDialogComponent } from './nuevo-sscc/observacion-dialog.component';

// 👇 TU NUEVO COMPONENTE
import { EstadocuentaclienteComponent } from './estadocuentacliente/estadocuentacliente.component';

// Angular Material
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
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatOptionModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

// Formato fecha personalizado
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';

// Ag-Grid y Handsontable
import { AgGridModule } from 'ag-grid-angular';
import { ButtonRendererComponent } from '../utils/grid/button-renderer.component';
import { CheckboxRendererComponents } from '../utils/grid/checkbox-renderer.component';
import { HotTableModule } from '@handsontable/angular';

// Módulo compartido
import { SharedModule } from 'src/app/shared/shared.module';
import { ProductosRoutingModule } from './productos-routing.module';
import { NuevoProductoComponent } from './nuevo-producto/nuevo-producto.component';
import { ClienteSeleccionadoComponent } from './cliente-seleccionado/cliente-seleccionado.component';
import { UvIndividualComponent } from './uv-individual/uv-individual.component';
import { UvIndividualEditComponent } from './uv-individual-edit/uv-individual-edit.component';
import { UlEditComponent } from './ul-edit/ul-edit.component';
import { NuevoSsccComponent } from './nuevo-sscc/nuevo-sscc.component';
import { CuponesComponent } from './cupones/cupones.component';

// Servicio
import { EstadoCuentaService } from 'src/app/services/estado-cuenta.service';

// 📌 Registrar locale español
registerLocaleData(localeEs);

// 📆 Formato personalizado DD/MM/YYYY
export const MY_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

@NgModule({
  declarations: [
    NavigationProductoComponent,
    GlnComponent,
    BloqueComponent,
    CheckboxRendererComponent,
    GcpBrickAutocompleteEditorComponent,
    DialogProcesoComponent,
    ObservacionDialogComponent,

    // 👇 AQUÍ VA TU COMPONENTE
    EstadocuentaclienteComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,

    // Standalone que ya usas
    NuevoProductoComponent,
    ClienteSeleccionadoComponent,
    UvIndividualComponent,
    UvIndividualEditComponent,
    UlEditComponent,
    NuevoSsccComponent,
    CuponesComponent,

    // Angular Material
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
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatOptionModule,
    MatAutocompleteModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,

    // Ag-Grid y Handsontable
    AgGridModule,       // 👈 SOLO EL MÓDULO, NO AgGridAngular
    HotTableModule,

    ProductosRoutingModule,
    SharedModule
  ],
  exports: [
    NavigationProductoComponent,
    BloqueComponent
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },

    // 👇 el servicio va como provider (aunque ya tiene providedIn: 'root', ni hace falta)
    EstadoCuentaService
  ]
})
export class ProductosModule {}
