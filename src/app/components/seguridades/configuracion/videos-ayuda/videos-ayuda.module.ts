import { NgModule } from '@angular/core';
import { ReusableModule } from '../../../reusable/reusable.module';
import { MatChipsModule } from '@angular/material/chips';
import { VideosAyudaComponent } from './videos-ayuda-list/videos-ayuda.component';
import { VideoFormModalComponent } from './videos-ayuda-modal/video-form-modal.component';
import { VideosAyudaRoutingModule } from './videos-ayuda-routing.module';

@NgModule({
  declarations: [
    VideosAyudaComponent,
    VideoFormModalComponent
  ],
  imports: [
    ReusableModule,
    MatChipsModule,
    VideosAyudaRoutingModule
  ]
})
export class VideosAyudaModule { }
