import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { Sic3000RoutingModule } from './sic-3000-routing.module'; // ✅ IMPORTACIÓN FALTANTE

@NgModule({
  declarations: [
    InicioSicComponent,
    NavigationSicComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    Sic3000RoutingModule 
  ]
})
export class Sic3000Module { }
