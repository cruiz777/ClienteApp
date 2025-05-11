import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusComponent } from './menus.component';
import { TipoClienteListComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';
import { TipoClienteFormComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-form/tipo-cliente-form.component';
import { GrupoClienteListComponent } from '../pages/clientes/grupo-clientes/grupo-cliente-list/grupo-cliente-list.component';
import { GrupoClienteFormComponent } from '../pages/clientes/grupo-clientes/grupo-cliente-form/grupo-cliente-form.component';
import { TipoLocalizacionListComponent } from '../pages/configuracion/localizacion-establecimiento/localizacion-est-list/localizacion-est-list.component';

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
          // { path: 'crear', component: GrupoClienteFormComponent },
          // { path: 'editar/:id', component: GrupoClienteFormComponent }
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
