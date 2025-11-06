import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NavigationSicComponent } from './navigation-sic/navigation-sic.component';
import { InicioSicComponent } from './inicio-sic/inicio-sic.component';
import { EstadocuentaclienteComponent } from './estadocuentacliente/estadocuentacliente.component';
import { EstructuraListComponent } from './estructuracomercial/estructura-list/estructura-list.component';
import { RegistroCobrosComponent } from './registro-cobros/registro-cobros.component';
import { FacturacionIndividualComponent } from './facturacion/facturacion-individual/facturacion-individual.component';
import { FacturacionGlobalComponent } from './facturacion/facturacion-global/facturacion-global.component';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { PermissionGuard } from 'src/app/guards/permission.guard';
import { CobroIndividualComponent } from './cobro-individual/cobro-individual.component';

//hermann

import { ProductosSicComponent } from './productos-sic/productos-sic.component';


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
      { path: 'cobroIndividual', component: CobroIndividualComponent },
      
      

      { path: 'estadocuentacliente', component: EstadocuentaclienteComponent },
   
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
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Sic3000RoutingModule {}