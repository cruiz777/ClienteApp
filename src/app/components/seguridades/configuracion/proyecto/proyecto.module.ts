import { NgModule } from '@angular/core';

import { MatChipsModule } from '@angular/material/chips';
import { ReusableModule } from 'src/app/components/reusable/reusable.module';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';
import { ProyectoRoutingModule } from './proyecto-routing.module';
import { ProyectoListComponent } from './proyecto-list/proyecto-list.component';
import { ProyectoFormComponent } from './proyecto-form/proyecto-form.component';


@NgModule({
  declarations: [
    ProyectoListComponent,
    ProyectoFormComponent
  ],
  imports: [
    ReusableModule,
    MatChipsModule,
    ProyectoRoutingModule
  ]
})
export class ProyectoModule { }
