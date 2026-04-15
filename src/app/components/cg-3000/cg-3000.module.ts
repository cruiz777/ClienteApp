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
import { Cg3000RoutingModule } from './cg-3000.routing.module';
import { InicioCgComponent } from './inicio-cg/inicio-cg.component';
import { NavigationCgComponent } from './navigation-cg/navigation-cg.component';
import { RegistroPagosProveedorComponent } from './cuentas-por-pagar/pago-proveedores/registro-pagos-proveedor.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlanCuentaCellEditorComponent, PlanCuentaCellEditorParams } from './cuentas-por-pagar/pago-proveedores/plan-cuenta-cell-editor.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { EstadoFinancieroComponent } from './balance/estado-financiero/estado-financiero.component';
import { ReporteComprasComponent } from './anexo-transaccional/reporte-compras/reporte-compras.component';
import { GenerarAtsComponent } from './anexo-transaccional/generacion-anexo/generar-ats.component';
import { PlanificacionPagosComponent } from './cuentas-por-pagar/planificacion-pagos/planificacion-pagos.component';
import { MatCardModule } from '@angular/material/card';
import { CierreContableComponent } from './configuracion/cierre-contable/cierre-contable.component';
import { AprobacionPlanificacionesComponent } from './cuentas-por-pagar/planificacion-pagos/aprobacion/aprobacion-planificaciones.component';
import { DetalleTransaccionDialogComponent } from './cuentas-por-pagar/planificacion-pagos/aprobacion/detalle-transaccion-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';




@NgModule({
  declarations: [
    InicioCgComponent,
    NavigationCgComponent,
    EstadoFinancieroComponent,
    RegistroPagosProveedorComponent,
    ReporteComprasComponent,
    PlanificacionPagosComponent,
    GenerarAtsComponent,
    CierreContableComponent,
    AprobacionPlanificacionesComponent,
    DetalleTransaccionDialogComponent,

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
    MatTooltipModule,
    PlanCuentaCellEditorComponent,    
    // Ruteo del feature
    Cg3000RoutingModule,
    MatOptionModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ]
})
export class Cg3000Module {}
