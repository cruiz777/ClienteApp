import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { NavigationCgComponent } from './navigation-cg/navigation-cg.component';
import { TipcuentaComponent } from './configuracion/tipcuenta/tipcuenta.component';
import { InicioCgComponent } from './inicio-cg/inicio-cg.component';
import { TipoRetencionComponent } from './configuracion/tipo-retenciones/tipo-retencion/tipo-retencion.component';

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
import { ReporteComprasComponent } from './anexo-transaccional/reporte-compras/reporte-compras.component';

const routes: Routes = [
  {
    path: '',
    component: NavigationCgComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'inicio-cg', pathMatch: 'full' },
      { path: 'inicio-cg', component: InicioCgComponent },
      { path: 'tipocuenta', component: TipcuentaComponent },
      { path: 'tipocuentaform', component: TipocuentaFormComponent },
      { path: 'tiporetencion', component: TipoRetencionComponent },
      { path: 'tiporetencionform', component: TipoRetencionFormComponent },
      { path: 'tipocomprobantesri', component: TipoComprobanteSriComponent },
      { path: 'tipoasiento', component: TipoAsientoComponent },
      { path: 'fechascontrol', component: FechasControlComponent },
      { path: 'bancos', component: BancosComponent },
      { path: 'bancosterceros', component: BancosTercerosComponent },
      { path: 'bancosempresa', component: BancosEmpresaComponent },
      { path: 'plancuentas', component: PlanCuentasTreeComponent },
      { path: 'numeroCheques', component: NumeroChequesListComponent },
      { path: 'codigoscontables', component: CodigosContablesComponent },
      { path: 'asientoscontables', component: AsientoFormComponent },
      { path: 'asientocontable', component: AsientoContableComponent },
      { path: 'ingresodocumentos', component: FacturasProveedorComponent },
      { path: 'anticipos', component: AnticipoCgFormComponent },
      { path: 'diario', component: DiarioMoviminetoListComponent },
      { path: 'balance', component: BalanceComprobacionComponent },
      { path: 'pago-proveedores', component: RegistroPagosProveedorComponent },
      { path: 'liquidacion-compra', component: LiquidacionCompraFormComponent },
      { path: 'liquidacion-compra-list', component: LiquidacionCompraComponent },
      { path: 'mayor', component: MayorCuentasListComponent },
      { path: 'estado-financiero', component: EstadoFinancieroComponent },
      { path: 'reporte-compras', component: ReporteComprasComponent },      
      { path: '**', redirectTo: 'inicio-cg' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Cg3000RoutingModule { }
