import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepartamentosListComponent } from './departamentos-list/departamentos-list.component';
import { DepartamentosFormComponent } from './departamentos-form/departamentos-form.component';
// import { EmpresaFormComponent } from './empresa-form/empresa-form.component';

const routes: Routes = [
  { path: '', component: DepartamentosListComponent },
  { path: 'crear', component: DepartamentosFormComponent },
  { path: 'editar/:id', component: DepartamentosFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DepartamentosRoutingModule { }
