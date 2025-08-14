import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { EstructuraListComponent } from './estructuracomercial/estructura-list/estructura-list.component';
import { RegistroCobrosComponent } from './registro-cobros/registro-cobros.component';
import { FacturacionIndividualComponent } from './facturacion/facturacion-individual/facturacion-individual.component';

const routes: Routes = [
  {
    path: '',
    component: NavigationSicComponent,
    children: [
      // redirige a la ruta que sí existe
      { path: '', redirectTo: 'inicio-sic', pathMatch: 'full' },

      { path: 'inicio-sic', component: InicioSicComponent },
      { path: 'estructura-list', component: EstructuraListComponent },
      { path: 'registroCobros', component: RegistroCobrosComponent },
      { path: 'findividual', component: FacturacionIndividualComponent },  
           
      
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Sic3000RoutingModule {}
