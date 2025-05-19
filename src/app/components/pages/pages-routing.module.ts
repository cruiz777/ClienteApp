import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PagesComponent } from './pages.component';
import { ClientesComponent } from './clientes/clientes.component';
import { NuevoClienteComponent } from './nuevo-cliente/nuevo-cliente.component';
import { TipoClienteListComponent } from './clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';
import { TipoClienteFormComponent } from './clientes/tipo-clientes/tipo-cliente-form/tipo-cliente-form.component';
import { GrupoClienteListComponent } from './clientes/grupo-clientes/grupo-cliente-list/grupo-cliente-list.component';
import { GrupoClienteFormComponent } from './clientes/grupo-clientes/grupo-cliente-form/grupo-cliente-form.component';

const routes: Routes = [
  {
    path: '', component: PagesComponent, children: [
      {path:'dashboard',component:DashboardComponent},
      {path:'clientes',component:ClientesComponent},
      {path:'nclientes',component:NuevoClienteComponent},
      {path:'tipocliente',component:TipoClienteListComponent},
      {path:'crear',component:TipoClienteFormComponent},
      {path:'editar/:id',component:TipoClienteFormComponent},
      {path:'grupocliente',component:GrupoClienteListComponent},
      {path:'crear',component:GrupoClienteFormComponent},
      {path:'editar/:id',component:GrupoClienteFormComponent},





    ]
  }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
