import { NgModule } from '@angular/core';

import { ReusableModule } from '../../reusable/reusable.module';
import { MatChipsModule } from '@angular/material/chips';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';
import { ZonaListComponent } from './zona-list/zona-list.component';
import { ZonaRoutingModule } from './zona-routing.module';
import { ZonaFormComponent } from './zona-form/zona-form.component';

@NgModule({
  declarations: [
    ZonaListComponent,
    ZonaFormComponent
  ],
  imports: [
    ReusableModule,
    MatChipsModule,
    ZonaRoutingModule
  ]
})
export class ZonaModule { }
