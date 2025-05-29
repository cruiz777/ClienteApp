import { NgModule } from '@angular/core';

import { MatChipsModule } from '@angular/material/chips';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';
import { TipoNegocioRoutingModule } from './tipo-negocio-routing.module';
import { TipoNegocioListComponent } from './tipo-negocio-list/tipo-negocio-list.component';
import { ReusableModule } from 'src/app/components/reusable/reusable.module';
import { TipoNegocioFormComponent } from './tipo-negocio-form/tipo-negocio-form.component';

@NgModule({
  declarations: [
    TipoNegocioListComponent,
    TipoNegocioFormComponent
  ],
  imports: [
    ReusableModule,
    MatChipsModule,
    TipoNegocioRoutingModule
  ],
  exports: [
    TipoNegocioListComponent,
    TipoNegocioFormComponent
  ]
})
export class TipoNegocioModule { }
