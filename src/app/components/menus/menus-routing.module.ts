import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusComponent } from './menus.component';
const routes: Routes = [
  {
    path: '', component: MenusComponent, children: [
      {path:'codbar',component:CodbarComponent},
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
