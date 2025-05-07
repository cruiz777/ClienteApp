import { NgModule } from '@angular/core';

import { EntidadRoutingModule } from './entidad-routing.module';
import { EntidadListComponent } from './entidad-list/entidad-list.component';
import { EntidadFormComponent } from './entidad-form/entidad-form.component';

import { ReusableModule } from '../../reusable/reusable.module';
import { MatChipsModule } from '@angular/material/chips';

@NgModule({
  declarations: [
    EntidadListComponent,
    EntidadFormComponent
  ],
  imports: [
    ReusableModule,
    MatChipsModule,
    EntidadRoutingModule
  ]
})
export class EntidadModule { }
