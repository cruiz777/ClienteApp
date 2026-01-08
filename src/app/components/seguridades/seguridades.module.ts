import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { SeguridadesComponent } from './seguridades.component';
import { ReusableModule } from '../reusable/reusable.module';
import { SeguridadesRoutingModule } from './seguridades-routing.module';
import { CorreoDialogComponent } from './dialogs/correo/correo-dialog.component';
import { TelefonoDialogComponent } from './dialogs/telefono/telefono-dialog.component';
import { DireccionDialogComponent } from './dialogs/direccion/direccion-dialog.component';
import { UppercaseDirective } from 'src/app/directives/uppercase.directive';
import { DepartamentoDialogComponent } from './dialogs/departamento/departamento-dialog.component';
import { SeguridadesInicioComponent } from './inicio/inicio.component';
import { SharedModule } from 'src/app/shared/shared.module';
@NgModule({
  declarations: [
    NavigationComponent,
    SeguridadesComponent,
    CorreoDialogComponent,
    TelefonoDialogComponent,
    DireccionDialogComponent,
    SeguridadesInicioComponent,
    DepartamentoDialogComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReusableModule,
    SeguridadesRoutingModule,
    SharedModule
  ],
  exports: [
    NavigationComponent
  ]
})
export class SeguridadesModule { }
