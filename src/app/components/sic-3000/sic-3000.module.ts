import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

import { Sic3000RoutingModule } from './sic-3000-routing.module';

import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { RegistroCobrosComponent } from './registro-cobros/registro-cobros.component';

// 👉 Standalone: se importa (no va en declarations)
import { FacturacionIndividualComponent } from './facturacion/facturacion-individual/facturacion-individual.component';

@NgModule({
  declarations: [
    InicioSicComponent,
    NavigationSicComponent,
    RegistroCobrosComponent
    // ❌ No declarar FacturacionIndividualComponent porque es standalone
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,

    // Angular Material
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTabsModule,

    // Ruteo del feature
    Sic3000RoutingModule,

    // ✅ Importar el componente standalone
    FacturacionIndividualComponent
  ]
})
export class Sic3000Module {}
