import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusComponent } from './menus.component';
import { TraspasoPrefijosComponent } from './prefijos/traspaso-prefijos/traspaso-prefijos.component';
import { BorrarPrefijoComponent } from './prefijos/borrar-prefijo/borrar-prefijo.component';
import { TraspasoGtinComponent } from './prefijos/traspaso-gtin/traspaso-gtin.component';

const routes: Routes = [
  {
    path: '', component: MenusComponent, children: [
      {path:'codbar',component:CodbarComponent},
      {path:'tras-prefijo',component:TraspasoPrefijosComponent},
      {path:'tras-gtin',component:TraspasoGtinComponent},
      {path:'eliminar-prefijo',component:BorrarPrefijoComponent},
      // {path:'usuarios',component:UsuariosComponent},
      // {path:'productos',component:ProductosComponent},
      // {path:'vender',component:VenderComponent},
      // {path:'historialventas',component:HistorialventaComponent},
      // {path:'reportes',component:ReportesComponent}
    ]
  }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MenusRoutingModule { }
