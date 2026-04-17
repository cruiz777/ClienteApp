import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AgGridModule } from 'ag-grid-angular';
import { NavigationRolComponent } from './navigation-rol/navigation-rol.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { Rol3000RoutingModule } from './rol-3000-routing.module';
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

@NgModule({
  declarations: [
    NavigationRolComponent,
    InicioRolComponent,
    EstructuraEmpleadosComponent,
    EmpleadoFichaComponent,
    EmpresaAdaptacionComponent,
    BancoRolComponent,
    ReporteEmpleadosComponent,
    ReporteCumpleaniosComponent,
    ReporteCargasComponent,
    ListadoFondosReservaComponent,
    TerminacionContratoComponent,
    ReporteEntradaSalidasComponent,
    TipoContratoComponent,
    PersonasDiscapacidadComponent,
    CambioSueldosComponent,
    SolicitudPermisoComponent,
    AprobacionComponent,
    RegistroVacacionesComponent,
    ReportePermisosComponent,
    ReporteVacacionesComponent,
    DetalleVacacionesEmpleadoComponent,
    ProcesarVacacionesComponent,
    RolMensualComponent

  ],
  imports: [
    CommonModule,
        SharedModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        AgGridModule,
        MatTableModule,
        // Angular Material
        MatSidenavModule,
        MatCardModule, 
        MatListModule,
        MatIconModule,
        MatExpansionModule,
        MatStepperModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatButtonModule,
        MatTabsModule,
        MatRadioModule,
        MatSelectModule,
        MatAutocompleteModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatOptionModule,
        MatSlideToggleModule,
        MatDatepickerModule,
        MatNativeDateModule,
    Rol3000RoutingModule
  ]
})
export class Rol3000Module { }
