import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SegmentoNegocioComponent } from './segmento-negocio.component';

const routes: Routes = [
  { path: '', component: SegmentoNegocioComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SegmentoNegocioRoutingModule { }
