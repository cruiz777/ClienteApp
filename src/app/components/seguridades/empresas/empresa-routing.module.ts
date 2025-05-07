import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmpresasListComponent } from './empresa-list/empresas-list.component';
// import { EmpresaFormComponent } from './empresa-form/empresa-form.component';

const routes: Routes = [
  { path: '', component: EmpresasListComponent },
  // { path: 'crear', component: EmpresaFormComponent },
  // { path: 'editar/:id', component: EmpresaFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EmpresasRoutingModule { }
