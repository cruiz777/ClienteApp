import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AgGridModule } from 'ag-grid-angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { Sic3000RoutingModule } from './sic-3000-routing.module';
import { RegistroCobrosComponent } from './registro-cobros/registro-cobros.component';
import { EstadocuentaclienteComponent } from './estadocuentacliente/estadocuentacliente.component';
import { ProductosSicComponent } from './productos-sic/productos-sic.component';
import { CobroIndividualComponent } from './cobro-individual/cobro-individual.component';
import { ReversionPagoComponent } from './reversion-pago/reversion-pago.component';
import { NotaDebitoComponent } from './nota-debito/nota-debito.component';
import { NotaCreditoComponent } from './nota-credito/nota-credito.component';
import { ExploradorEstadoCuentaComponent } from './explorador-estado-cuenta/explorador-estado-cuenta.component';

@NgModule({
  declarations: [
    InicioSicComponent,
    NavigationSicComponent,
    CobroIndividualComponent,
    RegistroCobrosComponent,
    ReversionPagoComponent,
    EstadocuentaclienteComponent,
    ProductosSicComponent,
    NotaDebitoComponent,
    NotaCreditoComponent,
    ExploradorEstadoCuentaComponent

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
    MatSelectModule,
    MatOptionModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    AgGridModule,
    Sic3000RoutingModule
  ]
})
export class Sic3000Module { }
