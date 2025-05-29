import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TipoNegocioListComponent } from '../tipo-negocio/tipo-negocio-list/tipo-negocio-list.component';
import { TipoNegocioFormComponent } from './tipo-negocio-form/tipo-negocio-form.component';

const routes: Routes = [
  { path: '', component: TipoNegocioListComponent },
  { path: 'crear', component: TipoNegocioFormComponent },
  { path: 'editar/:id', component: TipoNegocioFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TipoNegocioRoutingModule { }
