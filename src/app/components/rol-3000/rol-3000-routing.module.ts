import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { PermissionGuard } from 'src/app/guards/permission.guard';
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
import { TipoCuentaBancoComponent } from './configuracion/tipo-cuenta/list/tipo-cuenta.component';
import { RpBanTerceroComponent } from './configuracion/bancos/bancos-terceros/list/bancos-terceros-rol.component';
import { RpBancosComponent } from './configuracion/bancos/bancos/list/bancos-rol.component';
import { RpEmpresaComplementariaComponent } from './configuracion/empresa-complementaria/list/empresa-complementaria.component';
import { TipoNominaEspComponent } from './configuracion/tipo-nomina-esp/list/tipo-nomina-esp.component';
import { ExploradorEmpleadosComponent } from './empleados/explorador-empleado/explorador-empleado.component';
import { ExploradorNominaComponent } from './nomina/explorador-nomina/explorador-nomina.component';
const routes: Routes = [
   {
      path: '',
      component: NavigationRolComponent,
      canActivate: [AuthGuard],
      children: [
        { path: '', redirectTo: 'inicio-rol', pathMatch: 'full' },

        // INICIO - libre, mismo patrón que seguridades/inicio, sic-3000/inicio-sic
        // y cg-3000/inicio-cg (sin exigir el permiso raíz por el bug de backend)
        { path: 'inicio-rol', component: InicioRolComponent },
        // EMPLEADO - Archivo
        {
          path: 'empleado-estructura',
          component: EstructuraEmpleadosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.archivo.estructura-de-empleados' }
        },
        {
          path: 'empleado-ficha',
          component: EmpleadoFichaComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.archivo.empleado' }
        },
        {
          path: 'empleado-adaptacion',
          component: EmpresaAdaptacionComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.archivo.empresa-para-adaptación' }
        },
        {
          path: 'banco-rol',
          component: BancoRolComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.archivo.banco' }
        },

        // EMPLEADO - Reportes
        {
          path: 'reporte-empleados',
          component: ReporteEmpleadosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.reportes.empleados' }
        },
        {
          path: 'reporte-cumpleanios',
          component: ReporteCumpleaniosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.reportes.cumpleaños' }
        },
        {
          path: 'reporte-cargas',
          component: ReporteCargasComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.reportes.cargas' }
        },
        {
          path: 'listado-fondos-reserva',
          component: ListadoFondosReservaComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.reportes.fondos-de-reserva' }
        },
        {
          path: 'terminacion-contrato',
          component: TerminacionContratoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.reportes.terminacion-de-contrato' }
        },
        {
          path: 'reporte-entrada-salidas',
          component: ReporteEntradaSalidasComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.reportes.entrada-y-salidas' }
        },
        {
          path: 'tipo-contrato',
          component: TipoContratoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.reportes.tipo-de-contrato' }
        },
        {
          path: 'personas-discapacidad',
          component: PersonasDiscapacidadComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.reportes.personas-con-discapacidad' }
        },

        // EMPLEADO - Procesos
        {
          path: 'cambio-sueldos',
          component: CambioSueldosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.empleado.procesos.cambio-de-sueldos' }
        },

        // NOVEDADES - Generar
        {
          path: 'solicitud-permiso',
          component: SolicitudPermisoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.novedades.generar.solicitud-de-permiso' }
        },
        {
          path: 'aprobacion',
          component: AprobacionComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.novedades.generar.aprobacion' }
        },
        {
          path: 'registro-vacaciones',
          component: RegistroVacacionesComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.novedades.generar.registro-de-vacaciones' }
        },

        // NOVEDADES - Reportes
        {
          path: 'reporte-permisos',
          component: ReportePermisosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.novedades.reportes.permisos' }
        },
        {
          path: 'reporte-vacaciones',
          component: ReporteVacacionesComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.novedades.reportes.vacaciones' }
        },
        {
          path: 'detalle-vacaciones-empleado',
          component: DetalleVacacionesEmpleadoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.novedades.reportes.vacaciones-de-empleado' }
        },

        // NOVEDADES - Procesos
        {
          path: 'procesar-vacaciones',
          component: ProcesarVacacionesComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.novedades.procesos.periodo-de-vacaciones' }
        },

        // NOMINA - Roles
        {
          path: 'rol-mensual',
          component: RolMensualComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.rol-mensual' }
        },
        {
          path: 'rol-quincenal',
          component: RolQuincenalComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.rol-quincena' }
        },
        {
          path: 'rubros-fijos',
          component: RubrosFijosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.rubros-fijos' }
        },
        {
          path: 'anulacion-rol',
          component: AnulacionRolComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.anulación-de-rol-mensual' }
        },
        {
          path: 'anulacion-rolq',
          component: AnulacionRolqComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.anulación-de-rol-quincenal' }
        },
        {
          path: 'cierre-periodo-quincenal',
          component: CierrePeriodoQuincenalComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.cierre-de-periodo-quincenal' }
        },
        {
          path: 'cierre-periodo-mensual',
          component: CierrePeriodoMensualComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.cierre-de-periodo-mensual-nomina' }
        },
        {
          path: 'cierre-periodo-mensual-contable',
          component: CierrePeriodoMensualContableComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.cierre-de-periodo-mensual-contable' }
        },
        {
          path: 'generacion-contabilidad',
          component: GeneracionContabilidadComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.generacion-para-contabilidad' }
        },
        {
          path: 'impresion-contabilidad',
          component: ImpresionContabilidadComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.roles.impresion-asientos-diarios-y-provisiones' }
        },

        // NOMINA - Reportes
        {
          path: 'reporte-rol-nomina',
          component: ReporteRolNominaComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.rol-nomina' }
        },
        {
          path: 'reporte-rol-individual',
          component: ReporteRolIndividualComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.rol-individual' }
        },
        {
          path: 'reporte-listado-general',
          component: ReporteListadoGeneralComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.listado-general' }
        },
        {
          path: 'reporte-listado-general-gastos',
          component: ReporteListadoGeneralGastosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.listado-general-y-gastos' }
        },
        {
          path: 'reporte-provisiones',
          component: ReporteProvisionesComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.provision' }
        },
        {
          path: 'reporte-ingreso-descuentos-empleado',
          component: ReporteIngresoDescuentosEmpleadoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.ingreso-descuentos-por-empleado' }
        },
        {
          path: 'empleados-excluidos-nomina-actual',
          component: EmpleadosExcluidosNominaActualComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.empleados-excluidos' }
        },
        {
          path: 'resumen-inec',
          component: ResumenInecComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.resumen-inec' }
        },
        {
          path: 'personal-ocupado',
          component: PersonalOcupadoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.reportes.personal-ocupado' }
        },

        // NOMINA - Generación de archivo
        {
          path: 'generacion-aviso-nuevo-sueldo-iess',
          component: GeneracionAvisoNuevoSueldoIessComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina.generacion-archivo.aviso-nuevo-sueldo' }
        },

        // NÓMINA ESPECIAL
        {
          path: 'decimo-cuarto',
          component: DecimoCuartoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina-especial.nomina-especial.decimo-cuarto' }
        },
        {
          path: 'decimo-tercero',
          component: DecimoTerceroComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina-especial.nomina-especial.decimo-tercero' }
        },
        {
          path: 'fondo-reserva',
          component: FondoReservaComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina-especial.nomina-especial.fondos-reserva' }
        },
        {
          path: 'utilidades',
          component: UtilidadesComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.nomina-especial.nomina-especial.utilidades' }
        },

        // CONFIGURACIÓN
        {
          path: 'cargos',
          component: RpCargosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.cargos' }
        },
        {
          path: 'tipo-emp',
          component: RpTipEmpComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.tipos.tipo-empleado' }
        },
        {
          path: 'tipo-gasto',
          component: TipoGastoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.tipos.tipo-gasto' }
        },
        {
          path: 'nivel-instruccion',
          component: RpNivelInstruccionComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.niveles-de-instruccion' }
        },
        {
          path: 'parametros-costos',
          component: ParametrosCostosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.parametros-y-costos' }
        },
        {
          path: 'ingreso-descuentos',
          component: IngresoDescuentosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.ingreso-descuentos' }
        },
        {
          path: 'impuestos-renta',
          component: ImpuestoRentaComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.impuesto-a-la-renta' }
        },
        {
          path: 'sectorial',
          component: SectorialComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.sectorial' }
        },
        {
          path: 'forma-pago',
          component: RpFormaPagoRolComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.formas-de-pago' }
        },
        {
          path: 'tipo-sangre',
          component: RpTipoSangreComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.tipos.tipo-sangre' }
        },
        {
          path: 'regimen',
          component: RpRegimenComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.regimen' }
        },
        {
          path: 'tipo-cuenta',
          component: TipoCuentaBancoComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.tipos.tipo-cuenta' }
        },
        {
          path: 'bancos-terceros-rol',
          component: RpBanTerceroComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.bancos.bancos-terceros' }
        },
        {
          path: 'bancos-rol',
          component: RpBancosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.bancos' }
        },
        {
          path: 'emp-comp',
          component: RpEmpresaComplementariaComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.empresas-complementarias' }
        },
        {
          path: 'tipo-nomina-esp',
          component: TipoNominaEspComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.configuracion.tipos.tipo-nomina-especial' }
        },
        {
          path: 'explorador-nomina',
          component: ExploradorNominaComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.acumulados.acumulados' }
        },
        {
          path: 'explorador-empleados',
          component: ExploradorEmpleadosComponent,
          canActivate: [PermissionGuard],
          data: { permission: 'rol-3000.acumulados.explorador-de-empleados' }
        },

        { path: '**', redirectTo: 'inicio-rol' },
      ],
    },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Rol3000RoutingModule { }