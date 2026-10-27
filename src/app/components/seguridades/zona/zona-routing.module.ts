import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ZonaListComponent } from './zona-list/zona-list.component';
import { ZonaFormComponent } from './zona-form/zona-form.component';

const routes: Routes = [
  { path: '', component: ZonaListComponent },
  { path: 'crear', component: ZonaFormComponent },
  { path: 'editar/:id', component: ZonaFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ZonaRoutingModule { }
