import { FilePreviewComponent } from './../../util/preview/file-preview.component';
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
import { CreacionAnticiposComponent } from './anticipos/creacion-anticipos/creacion-anticipos.component';
import { ReporteAnticiposComponent } from './anticipos/reporte-anticipos/reporte-anticipos.component';

  import { FacturacionIndividualComponent } from './facturacion/facturacion-individual/facturacion-individual.component';
  import { FacturacionGlobalComponent } from './facturacion/facturacion-global/facturacion-global.component';
  import { MatTableModule } from '@angular/material/table';
  import { MatRadioModule } from '@angular/material/radio';
  import { MatSelectModule } from '@angular/material/select';
  import { MatOptionModule } from '@angular/material/core';
  import { MatSlideToggleModule } from '@angular/material/slide-toggle';
  import { MatDatepickerModule } from '@angular/material/datepicker';
  import { MatNativeDateModule } from '@angular/material/core';
  import { ProductosSicComponent } from './productos-sic/productos-sic.component';
  import { AgregarUbicacionDialogComponent } from './ubicaciones/dialogs/agregar-ubicacion-dialog.component';
  import { MatDialogModule } from '@angular/material/dialog';
  import { ProveedoresListaComponent } from './proveedores/proveedores.component';
  import { ProveedorDialogComponent } from './proveedores/dialog/proveedor-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { ProductosProveedorDialogComponent } from './proveedores/dialog/productos-proveedor/productos-proveedor-dialog.component';
import { BuscarAnticipoDialogComponent } from './anticipos/dialogs/buscar-anticipo-dialog/buscar-anticipo-dialog.component';
import { MotivoAnulacionDialogComponent } from './anticipos/dialogs/anular-anticipo-dialog/anular-anticipo-dialog';
import { CierreAnticiposComponent } from './anticipos/cierre-anticipos/cierre-anticipos.component';
import { EstadocuentaclienteComponent } from './exploradores/estadocuentacliente/estadocuentacliente.component';
import { CuentaxcobrarComponent } from './exploradores/cuentaxcobrar/cuentaxcobrar.component';


  @NgModule({
    declarations: [
      InicioSicComponent,
      NavigationSicComponent,
      ProductosSicComponent,
      ProveedoresListaComponent,
      ProveedorDialogComponent,
      ProductosProveedorDialogComponent,
      AgregarUbicacionDialogComponent,
      CierreAnticiposComponent,
      EstadocuentaclienteComponent,
      CuentaxcobrarComponent,
      FilePreviewComponent,

    ],
    imports: [
      CommonModule,
      RouterModule,
      FormsModule,
      ReactiveFormsModule,
      RegistroCobrosComponent,
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
      MatDialogModule,
      // Ruteo del feature
      Sic3000RoutingModule,
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
      MatMenuModule,
      AgGridModule,
      CreacionAnticiposComponent,
      ReporteAnticiposComponent,
      BuscarAnticipoDialogComponent,
      MotivoAnulacionDialogComponent
    ]
  })
  export class Sic3000Module {}
