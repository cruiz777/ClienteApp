import { NgModule, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PagesRoutingModule } from './pages-routing.module';
import { PagesComponent } from './pages.component';
import { RouterModule } from '@angular/router';
import { LayoutModule } from '@angular/cdk/layout';
import { ProductosModule } from 'src/app/components/productos/productos.module';

import { ReusableModule } from '../reusable/reusable.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ClientesComponent } from './clientes/clientes.component';
import { DialogClienteComponent } from './modals/dialog-cliente/dialog-cliente.component';
import { NuevoClienteComponent } from './nuevo-cliente/nuevo-cliente.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { DialogClienteEditarComponent } from './modals/dialog-cliente-editar/dialog-cliente-editar.component';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';
import { TipoClienteListComponent } from './clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';
import { TipoClienteFormComponent } from './clientes/tipo-clientes/tipo-cliente-form/tipo-cliente-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GrupoClienteListComponent } from './clientes/grupo-clientes/grupo-cliente-list/grupo-cliente-list.component';
import { GrupoClienteFormComponent } from './clientes/grupo-clientes/grupo-cliente-form/grupo-cliente-form.component';
import { TipoLocalizacionListComponent } from './configuracion/localizacion-establecimiento/localizacion-est-list/localizacion-est-list.component';
import { TipoLocalizacionFormComponent } from './configuracion/localizacion-establecimiento/localizacion-est-form/localizacion-est-form.component';
import { DialogPrefijoComponent } from './modals/dialog-prefijo/dialog-prefijo.component';
import { DialogPrefijoEditarComponent } from './modals/dialog-prefijo-editar/dialog-prefijo-editar.component';
import { ValidacionSriListComponent } from './validacion/validador-sri/validador-sri-list/validador-sri-list.component';
import { MatMenuModule } from '@angular/material/menu';
import { LicenseValidatorComponent } from './validacion/validador-licenses/validador-licenses.component';
import { ProductsLicenseValidator } from './validacion/validador-products/validador-products.component';
import { ProductoDetalleComponent } from './validacion/validacion-verified/validacion-verified.component';

@NgModule({
  declarations: [

  ],
  imports: [
  
  ]
})
export class PagesModule { }
