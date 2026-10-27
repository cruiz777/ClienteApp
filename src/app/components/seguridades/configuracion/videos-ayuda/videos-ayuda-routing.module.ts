import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VideosAyudaComponent } from './videos-ayuda-list/videos-ayuda.component';


const routes: Routes = [
  { path: '', component: VideosAyudaComponent, data: { permission: 'seguridades.configuracion.videos.ver' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VideosAyudaRoutingModule { }
