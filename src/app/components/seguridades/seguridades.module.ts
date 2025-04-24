import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { SeguridadesComponent } from './seguridades.component';
import { ReusableModule } from '../reusable/reusable.module';
import { SeguridadesRoutingModule } from './seguridades-routing.module';
@NgModule({
  declarations: [
    NavigationComponent,
    SeguridadesComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReusableModule,
    SeguridadesRoutingModule
  ],
  exports: [
    NavigationComponent
  ]
})
export class SeguridadesModule { }
