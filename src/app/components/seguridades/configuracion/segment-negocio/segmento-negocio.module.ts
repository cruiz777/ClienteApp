import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SegmentoNegocioComponent } from './segmento-negocio.component';
import { MatTabsModule } from '@angular/material/tabs';
import { SegmentoNegocioRoutingModule } from './segmento-negocio.routing.module';
import { TipoNegocioListComponent } from './tipo-negocio/tipo-negocio-list/tipo-negocio-list.component';
import { FormsModule } from '@angular/forms';
import { TipoNegocioModule } from './tipo-negocio/tipo-negocio.module';


@NgModule({
  declarations: [
    SegmentoNegocioComponent,
    // TipoNegocioListComponent
    // LocalComponent,
    // CentroCostosComponent
  ],
  imports: [
    CommonModule,
    SegmentoNegocioRoutingModule,
    MatTabsModule,
    FormsModule,
    TipoNegocioModule
  ]
})
export class SegmentoNegocioModule { }
