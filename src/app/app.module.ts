import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ReusableModule } from './components/reusable/reusable.module';
import { NgxMaskModule, IConfig } from 'ngx-mask';
import { InicioComponent } from './components/inicio/inicio.component';
import { CustomMessageBoxComponent } from './components/utils/messages/custom-message-box.component';

import { MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from './components/reusable/confirm-dialog/confirm-dialog.component';


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
  bootstrap: [AppComponent]
})
export class AppModule { }

