import { NgModule } from '@angular/core';

import { MatChipsModule } from '@angular/material/chips';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';

import { ReusableModule } from 'src/app/components/reusable/reusable.module';
import { ReactiveFormsModule } from '@angular/forms';
import { LocalesListComponent } from './local-list/local-list.component';
import { LocalFormComponent } from './local-form/local-form.component';
import { LocalRoutingModule } from './local-routing.module';


@NgModule({
  declarations: [
    LocalesListComponent,
    LocalFormComponent
  ],
  imports: [
    ReusableModule,
    ReactiveFormsModule,
    MatChipsModule,  
    LocalRoutingModule
  ],
  exports: [
    LocalesListComponent,
    LocalFormComponent
  ]
})
export class LocalModule { }
