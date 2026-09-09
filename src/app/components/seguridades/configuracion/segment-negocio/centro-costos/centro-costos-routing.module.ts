import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CentroCostosListComponent } from './centro-costos-list/centro-costos-list.component';

const routes: Routes = [
  { path: '', component: CentroCostosListComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CentroCostosRoutingModule { }
