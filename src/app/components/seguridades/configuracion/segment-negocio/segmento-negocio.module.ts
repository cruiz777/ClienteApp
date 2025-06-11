import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SegmentoNegocioComponent } from './segmento-negocio.component';
import { MatTabsModule } from '@angular/material/tabs';
import { SegmentoNegocioRoutingModule } from './segmento-negocio.routing.module';
import { TipoNegocioListComponent } from './tipo-negocio/tipo-negocio-list/tipo-negocio-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TipoNegocioModule } from './tipo-negocio/tipo-negocio.module';
import { CentroCostosModule } from './centro-costos/centro-costos.module';
import { LocalModule } from './local/local.module';


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
    TipoNegocioModule,
    CentroCostosModule,
    LocalModule
  ]
})
export class SegmentoNegocioModule { }
