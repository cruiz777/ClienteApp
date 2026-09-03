import { NgModule } from '@angular/core';
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
import { ReenvioFacComponent } from './facturacion/reenvio-fac/reenvio-fac.component';
import { AutorizacionCajaListComponent } from './autorizacion-caja-list/autorizacion-caja-list.component';
import { TipoDocListComponent } from './tipo-doc-list/tipo-doc-list.component';
import { ExploradorCxcGeneralComponent } from './exploradores/cxc-general/cxc-general.component';
import { EstadoCuentaGeneralComponent } from './exploradores/estado-cuenta-general/estado-cuenta-general.component';
import { DocElecLocalesComponent } from './facturacion/doc-elec-locales/doc-elec-locales.component';

const routes: Routes = [
  {
    path: '',
    component: NavigationSicComponent,
    canActivate: [AuthGuard], // 🔐 Autenticación a nivel padre
    children: [
      { path: '', redirectTo: 'inicio-sic', pathMatch: 'full' },

      // INICIO - accesible para cualquier usuario autenticado (igual que seguridades/inicio)
      // Se quitó el PermissionGuard porque el backend, al desactivar cualquier
      // hijo de 'sic-3000', omite el string raíz 'sic-3000' de permisos_flat
      // (bug reportado a backend). Mientras se corrige, el inicio queda libre.
      {
        path: 'inicio-sic',
        component: InicioSicComponent
      },

      // ESTRUCTURA COMERCIAL
      {
        path: 'estructura-list',
        component: EstructuraListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.inventarios.estructura-comercial' }
      },

      // CUENTAS POR COBRAR
      {
        path: 'registroCobros',
        component: RegistroCobrosComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.cuentas-por-cobrar.registro-cobros' }
      },
      {
        path: 'anularCobros',
        component: AnulacionPagoComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.cuentas-por-cobrar.reversion-pagos' }
      },
      {
        path: 'panulados',
        component: LisPagAnuladosComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.cuentas-por-cobrar.listado-pagos' }
      },
      {
        path: 'notaCredito',
        component: NotaCreditoComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.notas-de-credito-debito.notas-de-credito' }
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
      // {
      //   path: 'caja',
      //   component: CajaComponent,
      //   canActivate: [PermissionGuard],            
      //   data: { permission: 'sic-3000.configuracion.parametros.parametro-caja' }
      // },
      {
        path: 'fanuladas',
        component: LisFacAnuladasComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.facturas-anuladas' }
      },
      {
        path: 'doc-electronicos',
        component: DocElectronicosComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.documentos-electronicos' }
      },
      {
        path: 'doc-locales',
        component: DocElecLocalesComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.comparacion-documentos-electronicos' }
      },
      {
        path: 'reporte-ventas',
        component: ReporteVentasComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.reporte-ventas' }
      },

      // PRODUCTOS
      {
        path: 'productossic/:idProducto',
        component: ProductosSicComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.inventarios.producto' }
      },
      {
        path: 'productossic/estructura/:idEstructura',
        component: ProductosSicComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.inventarios.producto' }
      },
      {
        path: 'productossic',
        component: ProductosSicComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.inventarios.producto' }
      },

      {
        path: 'proveedores',
        component: ProveedoresListaComponent,
        canActivate: [PermissionGuard],        
        data: { permission: 'sic-3000.inventarios.proveedores' }
      },

      // CONFIGURACIÓN
      {
        path: 'formapago',
        component: FormaPagoListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.configuracion.forma-de-pago' }
      },
      {
        path: 'clasificacion',
        component: ClasificacionListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.configuracion.forma-de-pago.clasificacion-de-pagos' }
      },
      {
        path: 'cajas',
        component: AutorizacionCajaListComponent,
        canActivate: [PermissionGuard],        
        data: { permission: 'sic-3000.configuracion.parametros.parametro-caja' }
      },
      {
        path: 'tipdocsri',
        component: TipoDocListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.configuracion.tip-doc-sri' }
      },
      {
        path: 'descuento',
        component: DescuentoListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.configuracion.descuentos' }
      },
      {
        path: 'reenvio-fact',
        component: ReenvioFacComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.reenvio-documentos-electronicos' }
      },

      // ANTICIPOS
      {
        path: 'creacion-anticipos',
        component: CreacionAnticiposComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.anticipos.creacion-de-anticipos' }
      },
      {
        path: 'reporte-anticipos',
        component: ReporteAnticiposComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.anticipos.reporte-de-anticipos' }
      },
      {
        path: 'cierre-anticipos',
        component: CierreAnticiposComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.facturacion.anticipos.cierre-de-anticipos' }
      },

      // EXPLORADORES / REPORTES CxC
      {
        path: 'exp-estadocuenta',
        component: EstadocuentaclienteComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.cuentas-por-cobrar.reportes.estado-de-cuenta-cliente' }
      },
      {
        path: 'exp-cuentaxcobrar',
        component: CuentaxcobrarComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.cuentas-por-cobrar.explorador-de-cuentas-por-cobrar' }
      },
      {
        path: 'exp-cxc-general',
        component: ExploradorCxcGeneralComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.cuentas-por-cobrar.explorador-cuentas-por-cobrar-general' }
      },
      {
        path: 'exp-estado-cuenta-general',
        component: EstadoCuentaGeneralComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'sic-3000.cuentas-por-cobrar.explorador-estados-de-cuenta-general' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Sic3000RoutingModule {}