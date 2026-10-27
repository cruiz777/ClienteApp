import { NgModule } from '@angular/core';

import { ReusableModule } from '../../reusable/reusable.module';
import { MatChipsModule } from '@angular/material/chips';
import { DepartamentosListComponent } from './departamentos-list/departamentos-list.component';
import { DepartamentosRoutingModule } from './departamentos-routing.module';
import { DepartamentosFormComponent } from './departamentos-form/departamentos-form.component';

@NgModule({
  declarations: [
    DepartamentosListComponent,
    DepartamentosFormComponent
  ],
  imports: [
    ReusableModule,
    MatChipsModule,
    DepartamentosRoutingModule
  ]
})
export class DepartamentosModule { }
