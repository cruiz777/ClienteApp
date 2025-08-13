import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavegarComponent } from './navegar/navegar.component';
import { MenusComponent } from './menus.component';
import { TipoPrefijoComponent } from './prefijos/tipo-prefijo/tipo-prefijo.component';
import { ReusableModule } from '../reusable/reusable.module';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusRoutingModule } from './menus-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// 🆕 IMPORTS DE ANGULAR MATERIAL (de pages)
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { LayoutModule } from '@angular/cdk/layout';
import { RouterModule } from '@angular/router';

import { UppercaseDirective } from 'src/app/directives/uppercase.directive';
import { MatCardModule } from '@angular/material/card';
import { ExploradorComponent } from './explorador/explorador.component';
import { GerenciaComponent } from './gerencia/gerencia.component';
import { AgGridModule } from 'ag-grid-angular';

// 🆕 COMPONENTES MIGRADOS DE PAGES
import { DashboardComponent } from '../pages/dashboard/dashboard.component';
import { ClientesComponent } from '../pages/clientes/clientes.component';
import { NuevoClienteComponent } from '../pages/nuevo-cliente/nuevo-cliente.component';
import { TipoClienteListComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';
import { TipoClienteFormComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-form/tipo-cliente-form.component';
import { GrupoClienteListComponent } from '../pages/clientes/grupo-clientes/grupo-cliente-list/grupo-cliente-list.component';
import { GrupoClienteFormComponent } from '../pages/clientes/grupo-clientes/grupo-cliente-form/grupo-cliente-form.component';
import { TipoLocalizacionListComponent } from '../pages/configuracion/localizacion-establecimiento/localizacion-est-list/localizacion-est-list.component';
import { TipoLocalizacionFormComponent } from '../pages/configuracion/localizacion-establecimiento/localizacion-est-form/localizacion-est-form.component';
import { ValidacionSriListComponent } from '../pages/validacion/validador-sri/validador-sri-list/validador-sri-list.component';
import { LicenseValidatorComponent } from '../pages/validacion/validador-licenses/validador-licenses.component';
import { ProductsLicenseValidator } from '../pages/validacion/validador-products/validador-products.component';
import { ProductoDetalleComponent } from '../pages/validacion/validacion-verified/validacion-verified.component';

// 🆕 MODALES Y COMPONENTES DE APOYO (de pages)
import { DialogClienteComponent } from '../pages/modals/dialog-cliente/dialog-cliente.component';
import { DialogClienteEditarComponent } from '../pages/modals/dialog-cliente-editar/dialog-cliente-editar.component';
import { DialogPrefijoComponent } from '../pages/modals/dialog-prefijo/dialog-prefijo.component';
import { DialogPrefijoEditarComponent } from '../pages/modals/dialog-prefijo-editar/dialog-prefijo-editar.component';
import { CustomMessageBoxComponent } from 'src/app/util/messages/custom-message-box.component';

// 🆕 OTROS MÓDULOS NECESARIOS
import { ProductosModule } from 'src/app/components/productos/productos.module';
import { ExploradorClientesComponent } from '../pages/explorador-clientes/explorador-clientes.component';

@NgModule({
  declarations: [
    // Componentes originales de menus
    MenusComponent,
    CodbarComponent,
    NavegarComponent,

    // 🆕 COMPONENTES MIGRADOS DE PAGES
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
    ProductoDetalleComponent,

    // 🆕 MODALES Y COMPONENTES DE APOYO
    DialogClienteComponent,
    DialogClienteEditarComponent,
    DialogPrefijoComponent,
    DialogPrefijoEditarComponent,
    CustomMessageBoxComponent,
    ExploradorComponent,
    GerenciaComponent,
    TipoPrefijoComponent,
    ExploradorClientesComponent
    //TipoClienteListComponent
  ],
  imports: [
    CommonModule,
    MenusRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    
    // 🆕 ANGULAR MATERIAL
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatMenuModule,
    LayoutModule,
    
    // 🆕 OTROS MÓDULOS
    ReusableModule,
    ProductosModule,
    ReusableModule,
    MatCardModule,
    AgGridModule
  ]
})
export class MenusModule { }