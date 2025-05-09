import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { LocationStrategy, HashLocationStrategy } from '@angular/common';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

// Terceros
import { NgxMaskModule, IConfig } from 'ngx-mask';

// Componentes
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ReusableModule } from './components/reusable/reusable.module';
import { InicioComponent } from './components/inicio/inicio.component';
import { CustomMessageBoxComponent } from './components/utils/messages/custom-message-box.component';
import { ConfirmDialogComponent } from './components/reusable/confirm-dialog/confirm-dialog.component';
import { UppercaseDirective } from './directives/uppercase.directive';

export const options: Partial<null | IConfig> | (() => Partial<IConfig>) = null;

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    NotFoundComponent,
    InicioComponent,
    CustomMessageBoxComponent,
    ConfirmDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    AppRoutingModule,
    ReusableModule,
    NgxMaskModule.forRoot(),
  ],

  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
