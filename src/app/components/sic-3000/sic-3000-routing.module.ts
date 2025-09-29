import { EstadocuentaclienteComponent } from './estadocuentacliente/estadocuentacliente.component';
import { EstructuraListComponent } from './estructuracomercial/estructura-list/estructura-list.component';
import { NgModule, Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { RegistroCobrosComponent } from './registro-cobros/registro-cobros.component';
import { ProductosSicComponent } from './productos-sic/productos-sic.component';
import { InicioComponent } from '../inicio/inicio.component';
import { CobroIndividualComponent } from './cobro-individual/cobro-individual.component';
import { ReversionPagoComponent } from './reversion-pago/reversion-pago.component';


const routes: Routes = [
  {
    path: '',
    component: NavigationSicComponent,
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio-sic', component: InicioSicComponent },
      { path: 'estructura-list', component: EstructuraListComponent },
      { path: 'productossic', component:ProductosSicComponent },
      { path: 'cobroIndividual', component: CobroIndividualComponent },
      { path: 'registroCobros', component: RegistroCobrosComponent },
      { path: 'reversionPago', component: ReversionPagoComponent },
      { path: 'estadocuentacliente', component: EstadocuentaclienteComponent },
    ]

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes),

  ],
  exports: [RouterModule]
})
export class Sic3000RoutingModule { }
