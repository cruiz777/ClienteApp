import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { Sic3000RoutingModule } from './sic-3000-routing.module';
import { RegistroCobrosComponent } from './registro-cobros/registro-cobros.component';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EstadocuentaclienteComponent } from './estadocuentacliente/estadocuentacliente.component';


@NgModule({
   declarations: [
    InicioSicComponent,
    NavigationSicComponent,
    RegistroCobrosComponent,
    EstadocuentaclienteComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTableModule,
    MatRadioModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    Sic3000RoutingModule
  ]
})
export class Sic3000Module { }
