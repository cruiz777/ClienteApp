import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MapaComponent } from './maps/map.component';
import { IntlPhoneInputComponent } from './phone/intl-phone-input.component';

@NgModule({
  declarations: [
    MapaComponent,
    IntlPhoneInputComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule
  ],
  exports: [
    MapaComponent,
    IntlPhoneInputComponent
  ]
})
export class SharedModule { }
