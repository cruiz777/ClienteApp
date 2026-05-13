import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { NavigationRolComponent } from './navigation-rol/navigation-rol.component';
import { InicioRolComponent } from './inicio-rol/inicio-rol.component';
import { EstructuraEmpleadosComponent } from './empleados/estructura-empleados/estructura-empleados.component';
import { EmpleadoFichaComponent } from './empleados/empleado-ficha/empleado-ficha.component';
import { EmpresaAdaptacionComponent } from './empleados/empresa-adaptacion/empresa-adaptacion.component';
import { BancoRolComponent } from './empleados/banco-rol/banco-rol.component';
import { ReporteEmpleadosComponent } from './empleados/reportes/reporte-empleados/reporte-empleados.component';
import { ReporteCumpleaniosComponent } from './empleados/reportes/reporte-cumpleanios/reporte-cumpleanios.component';
import { ReporteCargasComponent } from './empleados/reportes/reporte-cargas/reporte-cargas.component';
import { ListadoFondosReservaComponent } from './empleados/reportes/listado-fondos-reserva/listado-fondos-reserva.component';
import { TerminacionContratoComponent } from './empleados/reportes/terminacion-contrato/terminacion-contrato.component';
import { ReporteEntradaSalidasComponent } from './empleados/reportes/reporte-entrada-salidas/reporte-entrada-salidas.component';
import { TipoContratoComponent } from './empleados/reportes/tipo-contrato/tipo-contrato.component';
import { PersonasDiscapacidadComponent } from './empleados/reportes/personas-discapacidad/personas-discapacidad.component';
import { CambioSueldosComponent } from './empleados/reportes/cambio-sueldos/cambio-sueldos.component';
import { SolicitudPermisoComponent } from './novedades/solicitud-permiso/solicitud-permiso.component';
import { AprobacionComponent } from './novedades/aprobacion/aprobacion.component'; 
import { RegistroVacacionesComponent } from './novedades/registro-vacaciones/registro-vacaciones.component'; 
import { ReportePermisosComponent } from './novedades/reporte-permisos/reporte-permisos.component';
import { ReporteVacacionesComponent } from './novedades/reporte-vacaciones/reporte-vacaciones.component';
import { DetalleVacacionesEmpleadoComponent } from './novedades/detalle-vacaciones-empleado/detalle-vacaciones-empleado.component';
import { ProcesarVacacionesComponent } from './novedades/procesar-vacaciones/procesar-vacaciones.component';
import { RolMensualComponent } from './nomina/rol-mensual/rol-mensual.component';
import { RolQuincenalComponent } from './nomina/rol-quincenal/rol-quincenal.component';
import { RubrosFijosComponent } from './nomina/rubros-fijos/rubros-fijos.component';
import { AnulacionRolComponent } from './nomina/anulacion-rol/anulacion-rol.component';
import { AnulacionRolqComponent } from './nomina/anulacion-rolq/anulacion-rolq.component';
import { CierrePeriodoQuincenalComponent } from './nomina/cierre-periodo-quincenal/cierre-periodo-quincenal.component';
import { CierrePeriodoMensualContableComponent } from './nomina/cierre-periodo-mensual-contable/cierre-periodo-mensual-contable.component';
import { CierrePeriodoMensualComponent } from './nomina/cierre-periodo-mensual/cierre-periodo-mensual.component';
import { GeneracionContabilidadComponent } from './nomina/generacion-contabilidad/generacion-contabilidad.component';
import { ImpresionContabilidadComponent } from './nomina/impresion-contabilidad/impresion-contabilidad.component';
import { ReporteRolNominaComponent } from './nomina/reportes/reporte-rol-nomina/reporte-rol-nomina.component';
import { ReporteRolIndividualComponent } from './nomina/reportes/reporte-rol-individual/reporte-rol-individual.component';
import { ReporteListadoGeneralComponent } from './nomina/reportes/reporte-listado-general/reporte-listado-general.component';
import { ReporteListadoGeneralGastosComponent } from './nomina/reportes/reporte-listado-general-gastos/reporte-listado-general-gastos.component';
import { ReporteProvisionesComponent } from './nomina/reportes/reporte-provisiones/reporte-provisiones.component';
import { ReporteIngresoDescuentosEmpleadoComponent } from './nomina/reportes/reporte-ingreso-descuentos-empleado/reporte-ingreso-descuentos-empleado.component';
import { EmpleadosExcluidosNominaActualComponent } from './nomina/reportes/empleados-excluidos-nomina-actual/empleados-excluidos-nomina-actual.component';
import { ResumenInecComponent } from './nomina/reportes/resumen-inec/resumen-inec.component';
import { PersonalOcupadoComponent } from './nomina/reportes/personal-ocupado/personal-ocupado.component';
import { GeneracionAvisoNuevoSueldoIessComponent } from './nomina/generacion/generacion-aviso-nuevo-sueldo-iess/generacion-aviso-nuevo-sueldo-iess.component';
import { DecimoCuartoComponent } from './especial/decimo-cuarto/decimo-cuarto.component';
import { DecimoTerceroComponent } from './especial/decimo-tercero/decimo-tercero.component';
import { FondoReservaComponent } from './especial/fondo-reserva/fondo-reserva.component';
import { UtilidadesComponent } from './especial/utilidades/utilidades.component';
import { RpCargosComponent } from './configuracion/cargos/list/cargos.component';
import { RpTipEmpComponent } from './configuracion/tipo-empleado/list/tipo-empleado.component';
import { TipoGastoComponent } from './configuracion/tipo-gasto/list/tipo-gasto.component';
import { RpNivelInstruccionComponent } from './configuracion/nivel-instruccion/list/nivel-instruccion.component';
import { ParametrosCostosComponent } from './configuracion/parametros-costos/list/parametros-costos.component';
import { IngresoDescuentosComponent } from './configuracion/ingreso-descuentos/list/ingreso-descuentos.component';
import { ImpuestoRentaService } from 'src/app/services/impuestos-renta-rol.service';
import { ImpuestoRentaComponent } from './configuracion/impuestos-renta-rol/list/impuestos-renta.component';
import { SectorialComponent } from './configuracion/sectorial/list/sectorial.component';
import { RpFormaPagoRolComponent } from './configuracion/forma-pago/list/forma-pago-rol.component';
import { RpTipoSangreComponent } from './configuracion/tipo-sangre/list/tipo-sangre.component';
import { RpRegimenComponent } from './configuracion/regimen/list/regimen.component';
const routes: Routes = [
   {
      path: '',
      component: NavigationRolComponent,
      canActivate: [AuthGuard],
      children: [
        { path: '', redirectTo: 'inicio-rol', pathMatch: 'full' },
        { path: 'inicio-rol', component: InicioRolComponent },
        {path:'empleado-estructura',component:EstructuraEmpleadosComponent},
        {path:'empleado-ficha',component:EmpleadoFichaComponent},
        {path:'empleado-adaptacion',component:EmpresaAdaptacionComponent},
        {path:'banco-rol',component:BancoRolComponent},
        {path:'reporte-empleados',component:ReporteEmpleadosComponent},
        {path:'reporte-cumpleanios',component:ReporteCumpleaniosComponent},
        {path:'reporte-cargas',component:ReporteCargasComponent}, 
        {path:'listado-fondos-reserva',component:ListadoFondosReservaComponent},
        {path:'terminacion-contrato',component:TerminacionContratoComponent},
        {path:'reporte-entrada-salidas',component:ReporteEntradaSalidasComponent},
        {path:'tipo-contrato',component:TipoContratoComponent},
        {path:'personas-discapacidad',component:PersonasDiscapacidadComponent},
        {path:'cambio-sueldos',component:CambioSueldosComponent},
        {path:'solicitud-permiso',component:SolicitudPermisoComponent},
        {path:'aprobacion',component:AprobacionComponent},
        {path:'registro-vacaciones',component:RegistroVacacionesComponent},
        {path:'reporte-permisos',component:ReportePermisosComponent},
        {path:'reporte-vacaciones',component:ReporteVacacionesComponent},
        {path:'detalle-vacaciones-empleado',component:DetalleVacacionesEmpleadoComponent},
        {path:'procesar-vacaciones',component:ProcesarVacacionesComponent},
        {path:'rol-mensual',component:RolMensualComponent},
        {path:'rol-quincenal',component:RolQuincenalComponent},
        {path:'rubros-fijos',component:RubrosFijosComponent},
        {path:'anulacion-rol',component:AnulacionRolComponent},
        {path:'anulacion-rolq',component:AnulacionRolqComponent},
        {path:'cierre-periodo-quincenal',component:CierrePeriodoQuincenalComponent},
        {path:'cierre-periodo-mensual',component:CierrePeriodoMensualComponent},
        {path:'cierre-periodo-mensual-contable',component:CierrePeriodoMensualContableComponent},
        {path:'generacion-contabilidad',component:GeneracionContabilidadComponent},
        {path:'impresion-contabilidad',component:ImpresionContabilidadComponent},
        {path:'reporte-rol-nomina',component:ReporteRolNominaComponent},
        {path:'reporte-rol-individual',component:ReporteRolIndividualComponent},
        {path:'reporte-listado-general',component:ReporteListadoGeneralComponent},
        {path:'reporte-listado-general-gastos',component:ReporteListadoGeneralGastosComponent},
        {path: 'reporte-provisiones', component: ReporteProvisionesComponent},
        {path: 'reporte-ingreso-descuentos-empleado', component: ReporteIngresoDescuentosEmpleadoComponent},
        {path: 'empleados-excluidos-nomina-actual', component: EmpleadosExcluidosNominaActualComponent},
        {path: 'resumen-inec', component: ResumenInecComponent},
        {path: 'personal-ocupado', component: PersonalOcupadoComponent},
        {path: 'generacion-aviso-nuevo-sueldo-iess', component: GeneracionAvisoNuevoSueldoIessComponent},
        {path: 'decimo-cuarto', component: DecimoCuartoComponent},
        {path: 'decimo-tercero', component: DecimoTerceroComponent},
        {path: 'fondo-reserva', component: FondoReservaComponent},
        {path:'utilidades', component: UtilidadesComponent},
        {path:'cargos', component: RpCargosComponent},
        {path:'tipo-emp', component: RpTipEmpComponent},
        {path:'tipo-gasto', component: TipoGastoComponent},
        {path:'nivel-instruccion', component: RpNivelInstruccionComponent},
        {path:'parametros-costos', component: ParametrosCostosComponent},
        {path:'ingreso-descuentos', component: IngresoDescuentosComponent},
        {path:'impuestos-renta', component: ImpuestoRentaComponent},
        {path:'sectorial', component: SectorialComponent},
        {path:'forma-pago', component: RpFormaPagoRolComponent},
        {path:'tipo-sangre', component: RpTipoSangreComponent},
        {path:'regimen', component: RpRegimenComponent},

        { path: '**', redirectTo: 'inicio-rol' },
      ],
    },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Rol3000RoutingModule { }
