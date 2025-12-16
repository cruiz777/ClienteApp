import { NgModule } from '@angular/core';
import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { EstructuraListComponent } from './estructuracomercial/estructura-list/estructura-list.component';
import { RegistroCobrosComponent } from './cxc/registro-cobros/registro-cobros.component';

import { FacturacionIndividualComponent } from './facturacion/facturacion-individual/facturacion-individual.component';
import { FacturacionGlobalComponent } from './facturacion/facturacion-global/facturacion-global.component';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { PermissionGuard } from 'src/app/guards/permission.guard';
import { AnulacionPagoComponent } from './cxc/anulacion-pago/anulacion-pago.component';
import { NotaCreditoComponent } from './cxc/nota-credito/nota-credito.component';
import { CajaComponent } from './facturacion/caja/caja.component';
import { LisFacAnuladasComponent } from './facturacion/lis-fac-anuladas/lis-fac-anuladas.component';
import { ProductosSicComponent } from './productos-sic/productos-sic.component';
import { InicioComponent } from '../inicio/inicio.component';
import { ProveedoresListaComponent } from './proveedores/proveedores.component';
import { CreacionAnticiposComponent } from './anticipos/creacion-anticipos/creacion-anticipos.component';
import { ReporteAnticiposComponent } from './anticipos/reporte-anticipos/reporte-anticipos.component';
import { LisPagAnuladosComponent } from './cxc/lis-pag-anulados/lis-pag-anulados.component';
import { CierreAnticiposComponent } from './anticipos/cierre-anticipos/cierre-anticipos.component';
import { EstadocuentaclienteComponent } from './exploradores/estadocuentacliente/estadocuentacliente.component';
import { CuentaxcobrarComponent } from './exploradores/cuentaxcobrar/cuentaxcobrar.component';
import { DocElectronicosComponent } from './facturacion/doc-electronicos/doc-electronicos.component';

import { FormaPagoListComponent } from './forma-pago/forma-pago-list.component';
import { ClasificacionListComponent } from './clasificacion-list/clasificacion-list.component';
import { DescuentoListComponent } from './descuento/descuento-list/descuento-list.component';
import { ReporteVentasComponent } from './reporte-ventas/reporte-ventas.component';

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
      {
        path: 'panulados',
        component: LisPagAnuladosComponent

      },
         {
        path: 'notaCredito',
        component: NotaCreditoComponent,

      },



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
      },
      {
        path: 'caja',
        component: CajaComponent

      }
      ,
      {
        path: 'fanuladas',
        component: LisFacAnuladasComponent

      },
      { path: 'doc-electronicos', component: DocElectronicosComponent},

      { path: 'reporte-ventas', component: ReporteVentasComponent},

      // ✅ Ruta para EDITAR producto (con ID)
      {
        path: 'productossic/:idProducto',
        component: ProductosSicComponent
      },
      // ✅ Ruta para CREAR producto desde estructura
      {
        path: 'productossic/estructura/:idEstructura',
        component: ProductosSicComponent
      },
      // ✅ Ruta para crear producto sin estructura (por si acaso)
      {
        path: 'productossic',
        component: ProductosSicComponent
      },
            {
        path: 'proveedores',
        component: ProveedoresListaComponent
      },

       {
        path: 'formapago',
        component:FormaPagoListComponent
      },
         {
        path: 'clasificacion',
        component:ClasificacionListComponent
      },
         {
        path: 'descuento',
        component:DescuentoListComponent
      },



      { path: 'creacion-anticipos', component: CreacionAnticiposComponent},
      { path: 'reporte-anticipos', component: ReporteAnticiposComponent},
      { path: 'cierre-anticipos', component: CierreAnticiposComponent},
      { path: 'exp-estadocuenta', component: EstadocuentaclienteComponent},
      { path: 'exp-cuentaxcobrar', component: CuentaxcobrarComponent}

    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Sic3000RoutingModule {}
