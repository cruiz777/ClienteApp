import { NgModule } from '@angular/core';

import { MatChipsModule } from '@angular/material/chips';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';

import { ReusableModule } from 'src/app/components/reusable/reusable.module';
import { ReactiveFormsModule } from '@angular/forms';
import { CentroCostosListComponent } from './centro-costos-list/centro-costos-list.component';
import { CentroCostosRoutingModule } from './centro-costos-routing.module';
import { CentroCostosFormComponent } from './centro-costos-form/centro-costos-form.component';

@NgModule({
  declarations: [
    CentroCostosListComponent,
    CentroCostosFormComponent
  ],
  imports: [
    ReusableModule,
    ReactiveFormsModule,
    MatChipsModule,  
    CentroCostosRoutingModule
  ],
  exports: [
    CentroCostosListComponent,
    CentroCostosFormComponent
  ]
})
export class CentroCostosModule { }
