import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntidadListComponent } from './entidad-list/entidad-list.component';

const routes: Routes = [
  { path: '', component: EntidadListComponent }
  // { path: 'crear', component: EntidadFormComponent },
  // { path: 'editar/:id', component: EntidadFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EntidadRoutingModule { }
