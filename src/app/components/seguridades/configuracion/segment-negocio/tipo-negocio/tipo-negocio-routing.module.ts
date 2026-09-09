import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TipoNegocioListComponent } from '../tipo-negocio/tipo-negocio-list/tipo-negocio-list.component';

const routes: Routes = [
  { path: '', component: TipoNegocioListComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TipoNegocioRoutingModule { }
