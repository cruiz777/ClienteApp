import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProyectoListComponent } from './proyecto-list/proyecto-list.component';


const routes: Routes = [
  { path: '', component: ProyectoListComponent },
  // { path: 'crear', component: ZonaFormComponent },
  // { path: 'editar/:id', component: ZonaFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProyectoRoutingModule { }
