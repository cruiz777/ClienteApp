import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmpresasListComponent } from '../seguridades/empresas/empresa-list/empresas-list.component';
import { SeguridadesComponent } from './seguridades.component';

const routes: Routes = [
  {
    path: '',
    component: SeguridadesComponent,
    children: [
      {
        path: 'empresas',
        loadChildren: () => import('./empresas/empresa.module').then(m => m.EmpresasModule)
      },
      {
        path: 'entidades',
        loadChildren: () => import('./entidades/entidad.module').then(m => m.EntidadModule)
      },
      {
        path: '',
        redirectTo: 'empresas',
        pathMatch: 'full'
      }
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeguridadesRoutingModule { }
