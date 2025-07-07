import { EstructuraListComponent } from './estructuracomercial/estructura-list/estructura-list.component';
import { NgModule, Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';


const routes: Routes = [
  {
    path: '',
    component: NavigationSicComponent,
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio-sic', component: InicioSicComponent },
      { path: 'estructura-list', component: EstructuraListComponent },
    ]

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Sic3000RoutingModule { }
