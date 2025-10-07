import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { EstadocuentaclienteComponent } from './estadocuentacliente/estadocuentacliente.component';
import { EstructuraListComponent } from './estructuracomercial/estructura-list/estructura-list.component';
import { RegistroCobrosComponent } from './cxc/registro-cobros/registro-cobros.component';
import { FacturacionIndividualComponent } from './facturacion/facturacion-individual/facturacion-individual.component';
import { FacturacionGlobalComponent } from './facturacion/facturacion-global/facturacion-global.component';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { PermissionGuard } from 'src/app/guards/permission.guard';
import { AnulacionPagoComponent } from './cxc/anulacion-pago/anulacion-pago.component';


const routes: Routes = [
  {
    path: '',
    component: NavigationSicComponent,
    canActivate: [AuthGuard], // 🔐 Proteger toda la sección con autenticación
    children: [
      // Redirige a la ruta que sí existe
      { path: '', redirectTo: 'inicio-sic', pathMatch: 'full' },

      // INICIO - Solo requiere acceso al módulo
      {
        path: 'inicio-sic',
        component: InicioSicComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000' } // ✅ Permiso específico
      },

      // ESTRUCTURA COMERCIAL
      {
        path: 'estructura-list',
        component: EstructuraListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.inventarios.estructura-comercial' }
      },

      {
        path: 'registroCobros',
        component: RegistroCobrosComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.cuentas-por-cobrar.registro-cobros' }
      },
       {
        path: 'anularCobros',
        component: AnulacionPagoComponent,
   
      },

      { path: 'estadocuentacliente', component: EstadocuentaclienteComponent },

      // FACTURACIÓN INDIVIDUAL
      {
        path: 'findividual',
        component: FacturacionIndividualComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.facturacion-individual' }
      },

      // FACTURACIÓN GLOBAL
      {
        path: 'fglobal',
        component: FacturacionGlobalComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.facturacion-global' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Sic3000RoutingModule {}