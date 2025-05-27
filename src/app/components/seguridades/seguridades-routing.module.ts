import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmpresasListComponent } from '../seguridades/empresas/empresa-list/empresas-list.component';
import { SeguridadesComponent } from './seguridades.component';
import { SeguridadesInicioComponent } from './inicio/inicio.component';

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
        path:'perfiles',
        loadChildren:()=>import('./perfiles/perfiles.module').then(m=>m.PerfilesModule)
      },
      {
        path:'departamentos',
        loadChildren:()=>import('./departamentos/departamentos.module').then(m=>m.DepartamentosModule)
      },
      {
        path:'zonas',
        loadChildren:()=>import('./zona/zona.module').then(m=>m.ZonaModule)
      },
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full'
      },
      {path:'inicio',component:SeguridadesInicioComponent},
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeguridadesRoutingModule { }
