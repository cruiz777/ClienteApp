import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


import { NavegarComponent } from './navegar/navegar.component';
import { MenusComponent } from './menus.component';

import { ReusableModule } from '../reusable/reusable.module';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusRoutingModule } from './menus-routing.module';



@NgModule({
  declarations: [
    MenusComponent,
    CodbarComponent,
    NavegarComponent,
    

  ],
  imports: [
    CommonModule,
    MenusRoutingModule,

    ReusableModule
  ]
})
export class MenusModule { }
