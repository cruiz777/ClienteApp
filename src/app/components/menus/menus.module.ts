import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


import { NavegarComponent } from './navegar/navegar.component';
import { MenusComponent } from './menus.component';

import { ReusableModule } from '../reusable/reusable.module';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusRoutingModule } from './menus-routing.module';
import { TipoClienteListComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';



@NgModule({
  declarations: [
    MenusComponent,
    CodbarComponent,
    NavegarComponent
    //TipoClienteListComponent

  ],
  imports: [
    CommonModule,
    MenusRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    ReusableModule
  ]
})
export class MenusModule { }
