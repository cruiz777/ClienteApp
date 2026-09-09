import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MapaComponent } from './maps/map.component';
import { UppercaseDirective } from '../directives/uppercase.directive';
import { PhoneInputComponent } from './phone/phone-input-component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserAvatarComponent } from './components/user-avatar/user-avatar.component';

@NgModule({
  declarations: [
    MapaComponent,
    UppercaseDirective,
    PhoneInputComponent,
    UserAvatarComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule
  ],
  exports: [
    MapaComponent,
    UppercaseDirective,
    PhoneInputComponent,
     UserAvatarComponent
  ]
})
export class SharedModule { }
