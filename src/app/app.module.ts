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
import { ToastrModule } from 'ngx-toastr';
import { HotTableModule } from '@handsontable/angular';
import { AgGridModule } from 'ag-grid-angular';

// Componentes
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ReusableModule } from './components/reusable/reusable.module';
import { InicioComponent } from './components/inicio/inicio.component';
import { CustomMessageBoxComponent } from './components/utils/messages/custom-message-box.component';
import { ConfirmDialogComponent } from './components/reusable/confirm-dialog/confirm-dialog.component';
import { ModalImpresionComponent } from './components/shared/modal-impresion/modal-impresion.component';
import { LoginFormComponent } from './components/login-form/login-form.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SharedModule } from './shared/shared.module';
import { ButtonRendererComponent } from './components/utils/grid/button-renderer.component';
import { CheckboxRendererComponents } from './components/utils/grid/checkbox-renderer.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UppercaseDirective } from './directives/uppercase.directive';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ApiKeyInterceptor } from './interceptors/api-key.interceptor';
import { SecurityInterceptor } from './interceptors/security.interceptor';
import { SinPermisosComponent } from './guards/sin-permisos.component';
import { ConfirmPasswordDialogComponent } from './components/utils/messages/confirm-password/confirm-password-dialog.component';

export const options: Partial<null | IConfig> | (() => Partial<IConfig>) = null;

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    NotFoundComponent,
    InicioComponent,
    CustomMessageBoxComponent,
    ConfirmPasswordDialogComponent,
    ConfirmDialogComponent,
    ModalImpresionComponent,
    ResetPasswordComponent,
    SinPermisosComponent
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
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      preventDuplicates: false,   // << permite mostrar varios pop ups
      timeOut: 5000,
      closeButton: true,
      progressBar: true
    }),
    HotTableModule,
    SharedModule,
    AgGridModule,
    MatProgressSpinnerModule,
    BrowserAnimationsModule
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiKeyInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SecurityInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
