import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusComponent } from './menus.component';
import { TipoClienteListComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';
import { TipoClienteFormComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-form/tipo-cliente-form.component';
import { GrupoClienteListComponent } from '../pages/clientes/grupo-clientes/grupo-cliente-list/grupo-cliente-list.component';
import { GrupoClienteFormComponent } from '../pages/clientes/grupo-clientes/grupo-cliente-form/grupo-cliente-form.component';
import { TipoLocalizacionListComponent } from '../pages/configuracion/localizacion-establecimiento/localizacion-est-list/localizacion-est-list.component';
import { TipoLocalizacionFormComponent } from '../pages/configuracion/localizacion-establecimiento/localizacion-est-form/localizacion-est-form.component';
import { TraspasoPrefijosComponent } from './prefijos/traspaso-prefijos/traspaso-prefijos.component';
import { BorrarPrefijoComponent } from './prefijos/borrar-prefijo/borrar-prefijo.component';
import { TraspasoGtinComponent } from './prefijos/traspaso-gtin/traspaso-gtin.component';
import { TipoPrefijoComponent } from './prefijos/tipo-prefijo/tipo-prefijo.component';
import { ValidacionSriListComponent } from '../pages/validacion/validador-sri/validador-sri-list/validador-sri-list.component';
import { LicenseValidatorComponent } from '../pages/validacion/validador-licenses/validador-licenses.component';
import { ProductsLicenseValidator } from '../pages/validacion/validador-products/validador-products.component';



const routes: Routes = [
  {
    path: '', component: MenusComponent, children: [
      {path:'codbar',component:CodbarComponent},

      {
        path: 'tipocliente',
        children: [
          { path: '', component: TipoClienteListComponent },
          { path: 'crear', component: TipoClienteFormComponent },
          { path: 'editar/:id', component: TipoClienteFormComponent }
        ]
      },
      {
        path: 'grupocliente',
        children: [
          { path: '', component: GrupoClienteListComponent },
          { path: 'crear', component: GrupoClienteFormComponent },
          { path: 'editar/:id', component: GrupoClienteFormComponent }
        ]
      },
      {
        path: 'localizacion-establecimiento',
        children: [
          { path: '', component: TipoLocalizacionListComponent },
          { path: 'crear', component: TipoLocalizacionFormComponent },
          { path: 'editar/:id', component: TipoLocalizacionFormComponent }
        ]
      },
      {path:'tras-prefijo',component:TraspasoPrefijosComponent},
      {path:'tras-gtin',component:TraspasoGtinComponent},
      {path:'eliminar-prefijo',component:BorrarPrefijoComponent},
      {path:'tipo-prefijo',component:TipoPrefijoComponent},

      {
        path: 'validacionsri',
        children: [
          { path: '', component: ValidacionSriListComponent },
          // { path: 'crear', component: TipoLocalizacionFormComponent },
          // { path: 'editar/:id', component: TipoLocalizacionFormComponent }
        ]
      },

      {
        path: 'validacion-licenses',
        children: [
          { path: '', component: LicenseValidatorComponent },
          // { path: 'crear', component: TipoLocalizacionFormComponent },
          // { path: 'editar/:id', component: TipoLocalizacionFormComponent }
        ]
      },

      {
        path: 'validacion-productos',
        children: [
          { path: '', component: ProductsLicenseValidator },
          // { path: 'crear', component: TipoLocalizacionFormComponent },
          // { path: 'editar/:id', component: TipoLocalizacionFormComponent }
        ]
      }
      
      // {path:'usuarios',component:UsuariosComponent},
      // {path:'productos',component:ProductosComponent},
      // {path:'vender',component:VenderComponent},
      // {path:'historialventas',component:HistorialventaComponent},
      // {path:'reportes',component:ReportesComponent}

    ]
  }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MenusRoutingModule { }
