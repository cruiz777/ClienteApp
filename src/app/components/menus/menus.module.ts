import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


import { NavegarComponent } from './navegar/navegar.component';
import { MenusComponent } from './menus.component';
import { TipoPrefijoComponent } from './prefijos/tipo-prefijo/tipo-prefijo.component';
import { ReusableModule } from '../reusable/reusable.module';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusRoutingModule } from './menus-routing.module';
import { TipoClienteListComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';
import { MatCardModule } from '@angular/material/card';
import { ExploradorComponent } from './explorador/explorador.component';
import { GerenciaComponent } from './gerencia/gerencia.component';
import { AgGridModule } from 'ag-grid-angular';


@NgModule({
  declarations: [
    MenusComponent,
    CodbarComponent,
    NavegarComponent,
    ExploradorComponent,
    GerenciaComponent,
    TipoPrefijoComponent
    //TipoClienteListComponent
  ],
  imports: [
    CommonModule,
    MenusRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    ReusableModule,
    MatCardModule,
    AgGridModule
  ]
})
export class MenusModule { }
