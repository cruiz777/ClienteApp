import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { AgGridModule } from 'ag-grid-angular';
import { Sic3000RoutingModule } from './sic-3000-routing.module';
import { RegistroCobrosComponent } from './cxc/registro-cobros/registro-cobros.component';
import { AnulacionPagoComponent } from './cxc/anulacion-pago/anulacion-pago.component';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';

// 👉 Standalone: se importa (no va en declarations)
import { FacturacionIndividualComponent } from './facturacion/facturacion-individual/facturacion-individual.component';
import { FacturacionGlobalComponent } from './facturacion/facturacion-global/facturacion-global.component';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { EstadocuentaclienteComponent } from './estadocuentacliente/estadocuentacliente.component';
import { ProductosSicComponent } from './productos-sic/productos-sic.component';
import { AgregarUbicacionDialogComponent } from './ubicaciones/dialogs/agregar-ubicacion-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { FilePreviewComponent } from 'src/app/util/preview/file-preview.component';


@NgModule({
  declarations: [
    InicioSicComponent,
    NavigationSicComponent,
    EstadocuentaclienteComponent,
    
    // ❌ No declarar FacturacionIndividualComponent porque es standalone
    ProductosSicComponent,
    AgregarUbicacionDialogComponent,
    FilePreviewComponent 
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridModule,
    MatTableModule,
    // Angular Material
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTabsModule,
    MatRadioModule,
    MatSelectModule,
    MatDialogModule,
    // Ruteo del feature
    Sic3000RoutingModule,
    MatOptionModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    // ✅ Importar el componente standalone
    FacturacionIndividualComponent,
    FacturacionGlobalComponent,
    MatTableModule,
    MatRadioModule,
    MatSelectModule,
    MatOptionModule,    
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,

    AgGridModule
  ]
})
export class Sic3000Module {}
