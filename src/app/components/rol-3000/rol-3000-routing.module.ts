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
        { path: '**', redirectTo: 'inicio-rol' },
      ],
    },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Rol3000RoutingModule { }
