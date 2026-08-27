import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { PermissionGuard } from 'src/app/guards/permission.guard';
import { NavigationCgComponent } from './navigation-cg/navigation-cg.component';
import { TipcuentaComponent } from './configuracion/tipcuenta/tipcuenta.component';
import { InicioCgComponent } from './inicio-cg/inicio-cg.component';
import { TipoRetencionComponent } from './configuracion/tipo-retenciones/tipo-retencion/tipo-retencion.component';
import { ReversaConciliacionComponent } from './conciliaciones/reversa-conciliacion/reversa-conciliacion.component';
// ⬇️ Usa la ruta REAL que tienes en disco: tipo-cuenta-form/tipo-cuente-form.component
import { TipocuentaFormComponent } from './configuracion/tipo-cuenta-form/tipo-cuenta-form.component';
import { TipoRetencionFormComponent } from './configuracion/tipo-retenciones/tipo-retencion-form/tipo-retencion-form.component';
import { TipoComprobanteSriComponent } from './configuracion/tipo-comprobante/tipo-comprobante-sri/tipo-comprobante-sri.component';
import { TipoAsientoComponent } from './configuracion/tipo-asiento/tipo-asiento-list/tipo-asiento-list.component';

import { FechasControlComponent } from './configuracion/fechas-control/fechas-control-list/fechas-control-list.component';
import { BancosComponent } from './configuracion/bancos/bancos-list/bancos-list.component';
import { BancosTercerosComponent } from './configuracion/bancos-terceros/bancos-terceros-list/bancos-terceros-list.component';
import { BancosEmpresaComponent } from './configuracion/bancos-empresa/bancos-empresa-list/bancos-empresa-list.component';
import { PlanCuentasTreeComponent } from './configuracion/plan-cuentas/plan-cuentas-list/plan-cuentas-tree.component';
import { NumeroChequesListComponent } from './configuracion/numero-cheques/numero-cheques-list/numero-cheques-list.component';
import { CodigosContablesComponent } from './configuracion/maestro-codigos/maestro-codigos-list/maestro-codigos-list.component';
import { AsientoFormComponent } from './configuracion/asientos/asientos-form/asiento-form.component';
import { AsientoContableComponent } from './transacciones/asientos-contables/asientos-contables-list/asientos-contables-list.component';
import { FacturasProveedorFormComponent } from './transacciones/facturas-proveedor/facturas-proveedor-form/facturas-proveedor-form.component';
import { FacturasProveedorComponent } from './transacciones/facturas-proveedor/facturas-proveedor-list/facturas-proveedor-list.component';
import { AnticipoCgFormComponent } from './transacciones/anticipos-cg/anticipos-cg-form/anticipos-cg-form.component';
import { BalanceComprobacionComponent } from './balance/balance/balance-comprobacion-list/balance-comprobacion-list.component'
import { DiarioMoviminetoListComponent } from './balance/diario/diario-movimineto-list/diario-movimineto-list.component';
import { RegistroPagosProveedorComponent } from './cuentas-por-pagar/pago-proveedores/registro-pagos-proveedor.component';
import { LiquidacionCompraFormComponent } from './transacciones/liquidacion-compra/liquidacion-compra-form/liquidacion-compra-form.component';
import { LiquidacionCompraComponent } from './transacciones/liquidacion-compra/liquidacion-compra-list/liquidacion-compra-list.component';
import { MayorCuentasListComponent } from './balance/mayor/mayor-cuentas-list/mayor-cuentas-list.component';
import { EstadoFinancieroComponent } from './balance/estado-financiero/estado-financiero.component';
import { ConciliacionComponent } from './conciliaciones/conciliar/conciliar-form/conciliar-form.component';
import { ReporteComprasComponent } from './anexo-transaccional/reporte-compras/reporte-compras.component';
import { ActivosFijosListComponent } from './activo-fijo/activos-fijos-list/activos-fijos-list.component';
import { ActivosFijosFormComponent } from './activo-fijo/activos-fijos-form/activos-fijos-form.component';
import { ReporteDepreciacionComponent } from './activo-fijo/reporte-depreciacion/reporte-depreciacion.component';
import { ReporteGeneralComponent } from './activo-fijo/reporte-general/reporte-general.component';
import { GenerarAtsComponent } from './anexo-transaccional/generacion-anexo/generar-ats.component';
import { MayorCodigosListComponent } from './balance/mayor/mayor-codigos/mayor-codigos.component';
import { PlanificacionPagosComponent } from './cuentas-por-pagar/planificacion-pagos/planificacion-pagos.component';
import { CierreContableComponent } from './configuracion/cierre-contable/cierre-contable.component';
import { CierreMensualComponent } from './configuracion/cierre-mensual/cierre-mensual.component';

const routes: Routes = [
  {
    path: '',
    component: NavigationCgComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'inicio-cg', pathMatch: 'full' },

      // INICIO - libre, igual que seguridades/inicio y sic-3000/inicio-sic
      // (no se exige el permiso raíz 'cg-3000' por el bug de backend ya reportado)
      { path: 'inicio-cg', component: InicioCgComponent },

      // CONFIGURACIÓN
      {
        path: 'tipocuenta',
        component: TipcuentaComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.registro-de-tipo-de-cuenta' }
      },
      {
        path: 'tipocuentaform',
        component: TipocuentaFormComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.registro-de-tipo-de-cuenta' }
      },
      {
        path: 'tiporetencion',
        component: TipoRetencionComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.tipo-de-retenciones' }
      },
      {
        path: 'tiporetencionform',
        component: TipoRetencionFormComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.tipo-de-retenciones' }
      },
      {
        path: 'tipocomprobantesri',
        component: TipoComprobanteSriComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.comprobantes-sri' }
      },
      {
        path: 'tipoasiento',
        component: TipoAsientoComponent,
        canActivate: [PermissionGuard],
        // Nota: 'tipo-documentos' es el único permiso de configuración sin
        // ruta asignada, y esta era la única ruta sin permiso — por
        // eliminación es el match más probable. Confirmar con backend.
        data: { permission: 'cg-3000.configuracion.tipo-documentos' }
      },
      {
        path: 'fechascontrol',
        component: FechasControlComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.fechas-de-control' }
      },
      {
        path: 'bancos',
        component: BancosComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.bancos' }
      },
      {
        path: 'bancosterceros',
        component: BancosTercerosComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.bancos.bancos-terceros' }
      },
      {
        path: 'bancosempresa',
        component: BancosEmpresaComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.bancos' }
      },
      {
        path: 'plancuentas',
        component: PlanCuentasTreeComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.plan-de-cuentas' }
      },
      {
        path: 'numeroCheques',
        component: NumeroChequesListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.numeracion-de-cheques' }
      },
      {
        path: 'codigoscontables',
        component: CodigosContablesComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.configuracion.codigos-contables' }
      },

      // TRANSACCIONES
      {
        path: 'asientoscontables',
        component: AsientoFormComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.transacciones.transacciones-generales' }
      },
      {
        path: 'asientocontable',
        component: AsientoContableComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.transacciones.transacciones-generales' }
      },

      // CUENTAS POR PAGAR
      {
        path: 'ingresodocumentos',
        component: FacturasProveedorComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.cuentas-por-pagar.ingreso-documentos.facturas' }
      },
      {
        path: 'anticipos',
        component: AnticipoCgFormComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.cuentas-por-pagar.pagos-a-proveedores.anticipos-a-proveedores' }
      },
      {
        path: 'pago-proveedores',
        component: RegistroPagosProveedorComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.cuentas-por-pagar.pagos-a-proveedores.pagos-individuales' }
      },
      {
        path: 'liquidacion-compra',
        component: LiquidacionCompraFormComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.cuentas-por-pagar.ingreso-documentos.liquidaciones-de-compra' }
      },
      {
        path: 'liquidacion-compra-list',
        component: LiquidacionCompraComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.cuentas-por-pagar.ingreso-documentos.liquidaciones-de-compra' }
      },
      {
        path: 'planificacion-pagos',
        component: PlanificacionPagosComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.cuentas-por-pagar.pagos-a-proveedores.planificacion-de-pagos' }
      },

      // CIERRES
      {
        path: 'cierre-anual',
        component: CierreContableComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.cierres.cierre-anual' }
      },
      {
        path: 'cierre-mensual',
        component: CierreMensualComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.cierres.cierre-mensual' }
      },

      // BALANCE
      {
        path: 'conciliacion',
        component: ConciliacionComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.balance.conciliacion.conciliacion-bancaria' }
      },
      {
        path: 'reversa-conciliacion',
        component: ReversaConciliacionComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.balance.conciliacion.reversar-conciliacion' }
      },
      {
        path: 'mayor',
        component: MayorCuentasListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.balance.balance.mayor-de-cuentas' }
      },
      {
        path: 'mayor-codigos',
        component: MayorCodigosListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.balance.balance.mayor-de-codigos' }
      },
      {
        path: 'diario',
        component: DiarioMoviminetoListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.balance.balance.diario-de-movimiento' }
      },
      {
        path: 'balance',
        component: BalanceComprobacionComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.balance.balance.balance-de-comprobacion' }
      },
      {
        path: 'estado-financiero',
        component: EstadoFinancieroComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.balance.estados-financieros.estado-financiero' }
      },

      // ANEXO TRANSACCIONAL (SRI)
      {
        path: 'reporte-compras',
        component: ReporteComprasComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.anexo-transaccional.reporte-de-compras' }
      },
      {
        path: 'generar-ats',
        component: GenerarAtsComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.anexo-transaccional.generar-ats' }
      },

      // ACTIVOS FIJOS
      {
        path: 'activo-fijo',
        component: ActivosFijosListComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.activos-fijos.explorador-activos-fijos' }
      },
      {
        path: 'activo-fijo/nuevo',
        component: ActivosFijosFormComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.activos-fijos.explorador-activos-fijos' }
      },
      {
        path: 'activo-fijo/editar/:id',
        component: ActivosFijosFormComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.activos-fijos.explorador-activos-fijos' }
      },
      {
        path: 'activo-fijo/depre',
        component: ReporteDepreciacionComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.activos-fijos.explorador-activos-fijos' }
      },
      {
        path: 'activo-fijo/general',
        component: ReporteGeneralComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'cg-3000.activos-fijos.explorador-activos-fijos' }
      },

      { path: '**', redirectTo: 'inicio-cg' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Cg3000RoutingModule { }