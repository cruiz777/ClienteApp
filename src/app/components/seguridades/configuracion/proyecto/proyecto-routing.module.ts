import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProyectoListComponent } from './proyecto-list/proyecto-list.component';
import { ProyectoFormComponent } from './proyecto-form/proyecto-form.component';


const routes: Routes = [
  { path: '', component: ProyectoListComponent },
  { path: 'crear', component: ProyectoFormComponent },
  { path: 'editar/:id', component:  ProyectoFormComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProyectoRoutingModule { }
