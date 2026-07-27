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
import { ImpuestoRentaComponent } from './configuracion/impuestos-renta-rol/list/impuestos-renta.component';
import { SectorialComponent } from './configuracion/sectorial/list/sectorial.component';
import { RpFormaPagoRolComponent } from './configuracion/forma-pago/list/forma-pago-rol.component';
import { RpTipoSangreComponent } from './configuracion/tipo-sangre/list/tipo-sangre.component';
import { RpRegimenComponent } from './configuracion/regimen/list/regimen.component';
import { TipocuentaFormComponent } from '../cg-3000/configuracion/tipo-cuenta-form/tipo-cuenta-form.component';
import { RpBanTerceroComponent } from './configuracion/bancos/bancos-terceros/list/bancos-terceros-rol.component';
import { RpBancosComponent } from './configuracion/bancos/bancos/list/bancos-rol.component';
import { RpEmpresaComplementariaComponent } from './configuracion/empresa-complementaria/list/empresa-complementaria.component';
import { TipoNominaEspComponent } from './configuracion/tipo-nomina-esp/list/tipo-nomina-esp.component';
import { MatMenuModule } from '@angular/material/menu';
import { PeriodosNominaDialogComponent } from './especial/dialogs/periodos-nomina-dialog.component';
import {RolIndividualDialogComponent} from './nomina/rol-individual-dialog/rol-individual-dialog.component';
import { DialogCargaGlobalRubrosFijosComponent } from './nomina/rubros-fijos/dialog-carga-global-rubros-fijo/dialog-carga-global-rubros-fijo.component';
import { DialogBancoNominaComponent } from './nomina/dialog-banco-nomina/dialog-banco-nomina.component';

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
    RolMensualComponent,
    RolQuincenalComponent,
    RubrosFijosComponent,
   AnulacionRolComponent,
   AnulacionRolqComponent,
    CierrePeriodoQuincenalComponent,
    CierrePeriodoMensualComponent,
    CierrePeriodoMensualContableComponent,
    GeneracionContabilidadComponent,
    ImpresionContabilidadComponent,
    ReporteRolNominaComponent,
    ReporteRolIndividualComponent,
    ReporteListadoGeneralComponent,
    ReporteListadoGeneralGastosComponent,
    ReporteProvisionesComponent,
    ReporteIngresoDescuentosEmpleadoComponent,
    EmpleadosExcluidosNominaActualComponent,
    ResumenInecComponent,
    PersonalOcupadoComponent,
    GeneracionAvisoNuevoSueldoIessComponent,
    DecimoCuartoComponent,
    DecimoTerceroComponent,
    FondoReservaComponent,
    UtilidadesComponent,
    PeriodosNominaDialogComponent,
    RolIndividualDialogComponent,
    DialogCargaGlobalRubrosFijosComponent
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
        MatMenuModule,
        RpCargosComponent,
        RpTipEmpComponent,
        TipoGastoComponent,
        RpNivelInstruccionComponent,
        ParametrosCostosComponent,
        IngresoDescuentosComponent,
        ImpuestoRentaComponent,
        SectorialComponent,
        RpFormaPagoRolComponent,
        RpTipoSangreComponent,
        RpRegimenComponent,
        TipocuentaFormComponent,
        RpBanTerceroComponent,
        RpBancosComponent,
        RpEmpresaComplementariaComponent,
        TipoNominaEspComponent,
        DialogBancoNominaComponent,
        Rol3000RoutingModule
  ]
})
export class Rol3000Module { }