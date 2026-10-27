import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NavegarComponent } from './navegar/navegar.component';
import { MenusComponent } from './menus.component';
import { TipoPrefijoComponent } from './prefijos/tipo-prefijo/tipo-prefijo.component';
import { ReusableModule } from '../reusable/reusable.module';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusRoutingModule } from './menus-routing.module';

import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LayoutModule } from '@angular/cdk/layout';
import { RouterModule } from '@angular/router';

import { AgGridModule } from 'ag-grid-angular';

import { ExploradorComponent } from './explorador/explorador.component';
import { GerenciaComponent } from './gerencia/gerencia.component';
import { DashboardFacturacionComponent } from './dashboard-facturacion/dashboard-facturacion.component';
import { Gs1ScannerComponent } from './gs1-scanner/gs1-scanner.component';


// ==========================================================
// COMPONENTES STANDALONE
// ==========================================================

import {
  AuditoriaClientesComponent
} from './explorador/auditoria-clientes/auditoria-clientes.component';

import {
  EliminarProductosBloqueComponent
} from './eliminar-productos-bloque/eliminar-productos-bloque.component';

import {
  AuditoriaProductosVerifiedComponent
} from '../pages/validacion/eliminar-products/auditoria-productos-verified/auditoria-productos-verified.component';


// ==========================================================
// COMPONENTES PAGES
// ==========================================================

import {
  DashboardComponent
} from '../pages/dashboard/dashboard.component';

import {
  ClientesComponent
} from '../pages/clientes/clientes.component';

import {
  NuevoClienteComponent
} from '../pages/nuevo-cliente/nuevo-cliente.component';

import {
  TipoClienteListComponent
} from '../pages/clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';

import {
  TipoClienteFormComponent
} from '../pages/clientes/tipo-clientes/tipo-cliente-form/tipo-cliente-form.component';

import {
  GrupoClienteListComponent
} from '../pages/clientes/grupo-clientes/grupo-cliente-list/grupo-cliente-list.component';

import {
  GrupoClienteFormComponent
} from '../pages/clientes/grupo-clientes/grupo-cliente-form/grupo-cliente-form.component';

import {
  TipoLocalizacionListComponent
} from '../pages/configuracion/localizacion-establecimiento/localizacion-est-list/localizacion-est-list.component';

import {
  TipoLocalizacionFormComponent
} from '../pages/configuracion/localizacion-establecimiento/localizacion-est-form/localizacion-est-form.component';

import {
  ValidacionSriListComponent
} from '../pages/validacion/validador-sri/validador-sri-list/validador-sri-list.component';

import {
  LicenseValidatorComponent
} from '../pages/validacion/validador-licenses/validador-licenses.component';

import {
  ProductsLicenseValidator
} from '../pages/validacion/validador-products/validador-products.component';

import {
  EliminarProductsComponent
} from '../pages/validacion/eliminar-products/eliminar-products.component';

import {
  ProductoDetalleComponent
} from '../pages/validacion/validacion-verified/validacion-verified.component';

import {
  EditarLicensesComponent
} from '../pages/validacion/editar-licenses/editar-licenses.component';

import {
  AuditoriaLicenciasVerifiedComponent
} from '../pages/validacion/auditoria-licencias-verified/auditoria-licencias-verified.component';


// ==========================================================
// MODALES
// ==========================================================

import {
  DialogClienteComponent
} from '../pages/modals/dialog-cliente/dialog-cliente.component';

import {
  DialogClienteEditarComponent
} from '../pages/modals/dialog-cliente-editar/dialog-cliente-editar.component';

import {
  DialogPrefijoComponent
} from '../pages/modals/dialog-prefijo/dialog-prefijo.component';

import {
  DialogPrefijoEditarComponent
} from '../pages/modals/dialog-prefijo-editar/dialog-prefijo-editar.component';

import {
  CustomMessageBoxComponent
} from 'src/app/util/messages/custom-message-box.component';


// ==========================================================
// OTROS
// ==========================================================

import {
  ProductosModule
} from 'src/app/components/productos/productos.module';

import {
  ExploradorClientesComponent
} from '../pages/explorador-clientes/explorador-clientes.component';

import {
  SharedModule
} from 'src/app/shared/shared.module';


@NgModule({

  declarations: [

    // ======================================================
    // COMPONENTES ORIGINALES
    // ======================================================

    MenusComponent,
    CodbarComponent,
    NavegarComponent,
    Gs1ScannerComponent,


    // ======================================================
    // PAGES
    // ======================================================

    DashboardComponent,
    ClientesComponent,
    NuevoClienteComponent,

    TipoClienteListComponent,
    TipoClienteFormComponent,

    GrupoClienteListComponent,
    GrupoClienteFormComponent,

    TipoLocalizacionListComponent,
    TipoLocalizacionFormComponent,

    ValidacionSriListComponent,

    LicenseValidatorComponent,
    ProductsLicenseValidator,
    EliminarProductsComponent,

    ProductoDetalleComponent,

    EditarLicensesComponent,

    AuditoriaLicenciasVerifiedComponent,


    // ======================================================
    // MODALES NO-STANDALONE
    // ======================================================

    DialogClienteComponent,
    DialogClienteEditarComponent,

    DialogPrefijoComponent,
    DialogPrefijoEditarComponent,

    CustomMessageBoxComponent,


    // ======================================================
    // OTROS
    // ======================================================

    ExploradorComponent,
    GerenciaComponent,
    TipoPrefijoComponent,
    ExploradorClientesComponent,
    DashboardFacturacionComponent

  ],


  imports: [

    CommonModule,

    MenusRoutingModule,

    RouterModule,

    FormsModule,

    ReactiveFormsModule,

    SharedModule,


    // ======================================================
    // MATERIAL
    // ======================================================

    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatMenuModule,
    LayoutModule,
    MatTooltipModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,


    // ======================================================
    // AG GRID
    // ======================================================

    AgGridModule,


    // ======================================================
    // OTROS MÓDULOS
    // ======================================================

    ReusableModule,
    ProductosModule,


    // ======================================================
    // COMPONENTES STANDALONE
    // ======================================================

    AuditoriaClientesComponent,

    EliminarProductosBloqueComponent,

    AuditoriaProductosVerifiedComponent

  ]

})
export class MenusModule {
}