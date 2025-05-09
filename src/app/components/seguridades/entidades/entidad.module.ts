import { NgModule } from '@angular/core';

import { EntidadRoutingModule } from './entidad-routing.module';
import { EntidadListComponent } from './entidad-list/entidad-list.component';
import { EntidadFormComponent } from './entidad-form/entidad-form.component';

import { ReusableModule } from '../../reusable/reusable.module';
import { MatChipsModule } from '@angular/material/chips';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';

@NgModule({
  declarations: [
    EntidadListComponent,
    EntidadFormComponent,
    UppercaseDirective
  ],
  imports: [
    ReusableModule,
    MatChipsModule,
    EntidadRoutingModule
  ]
})
export class EntidadModule { }
