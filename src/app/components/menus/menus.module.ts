import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


import { NavegarComponent } from './navegar/navegar.component';
import { MenusComponent } from './menus.component';

import { ReusableModule } from '../reusable/reusable.module';
import { DialogUsuarioComponent } from './modals/dialog-usuario/dialog-usuario.component';
import { DialogProductoComponent } from './modals/dialog-producto/dialog-producto.component';
import { DialogDeleteUsuarioComponent } from './modals/dialog-delete-usuario/dialog-delete-usuario.component';
import { DialogDeleteProductoComponent } from './modals/dialog-delete-producto/dialog-delete-producto.component';
import { DialogDetalleVentaComponent } from './modals/dialog-detalle-venta/dialog-detalle-venta.component';
import { DialogResultadoVentaComponent } from './modals/dialog-resultado-venta/dialog-resultado-venta.component';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusRoutingModule } from './menus-routing.module';


@NgModule({
  declarations: [
    MenusComponent,
    CodbarComponent,
    NavegarComponent,
    DialogUsuarioComponent,
    DialogProductoComponent,
    DialogDeleteUsuarioComponent,
    DialogDeleteProductoComponent,
    DialogDetalleVentaComponent,
    DialogResultadoVentaComponent,
  ],
  imports: [
    CommonModule,
    MenusRoutingModule,

    ReusableModule
  ]
})
export class MenusModule { }
