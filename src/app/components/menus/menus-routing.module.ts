import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusComponent } from './menus.component';

//GUARD de permisos
import { PermissionGuard } from 'src/app/guards/permission.guard';

// Componentes de CODBAR originales
import { TipoClienteListComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-list/tipo-cliente-list.component';
import { TipoClienteFormComponent } from '../pages/clientes/tipo-clientes/tipo-cliente-form/tipo-cliente-form.component';
import { GrupoClienteListComponent } from '../pages/clientes/grupo-clientes/grupo-cliente-list/grupo-cliente-list.component';
import { GrupoClienteFormComponent } from '../pages/clientes/grupo-clientes/grupo-cliente-form/grupo-cliente-form.component';
import { TipoLocalizacionListComponent } from '../pages/configuracion/localizacion-establecimiento/localizacion-est-list/localizacion-est-list.component';
import { TipoLocalizacionFormComponent } from '../pages/configuracion/localizacion-establecimiento/localizacion-est-form/localizacion-est-form.component';
import { TraspasoPrefijosComponent } from './prefijos/traspaso-prefijos/traspaso-prefijos.component';
import { BorrarPrefijoComponent } from './prefijos/borrar-prefijo/borrar-prefijo.component';
import { TraspasoGtinComponent } from './prefijos/traspaso-gtin/traspaso-gtin.component';
import { TipoPrefijoComponent } from './prefijos/tipo-prefijo/tipo-prefijo.component';
import { ValidacionSriListComponent } from '../pages/validacion/validador-sri/validador-sri-list/validador-sri-list.component';
import { LicenseValidatorComponent } from '../pages/validacion/validador-licenses/validador-licenses.component';
import { ProductsLicenseValidator } from '../pages/validacion/validador-products/validador-products.component';

// 🆕 Componentes de PAGES integrados
import { DashboardComponent } from '../pages/dashboard/dashboard.component';
import { ClientesComponent } from '../pages/clientes/clientes.component';
import { NuevoClienteComponent } from '../pages/nuevo-cliente/nuevo-cliente.component';
import { ProductoDetalleComponent } from '../pages/validacion/validacion-verified/validacion-verified.component';
import { ExploradorComponent } from './explorador/explorador.component';
import { GerenciaComponent } from './gerencia/gerencia.component';
import { GrupoProductoListaComponent } from './grupo-producto-lista/grupo-producto-lista.component';
import { GerenciaEmpresasComponent } from './gerencia-empresas/gerencia-empresas.component';
import { Gs1ScannerComponent } from './gs1-scanner/gs1-scanner.component';
import { DashboardFacturacionComponent } from './dashboard-facturacion/dashboard-facturacion.component';

const routes: Routes = [
  {
    path: '', 
    component: MenusComponent, // Layout principal de CODBAR
    children: [
      // ✅ Página de inicio de CODBAR (sin guard)
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: CodbarComponent },

      // ✅ MÓDULO: Ficha de Cliente - CON GUARDS APLICADOS
      {
        path: 'ficha-de-cliente',
        children: [
          // Dashboard/inicio de ficha cliente
          { path: '', redirectTo: 'listado-clientes', pathMatch: 'full' },
          
          // 🔒 Funcionalidades principales PROTEGIDAS
          { 
            path: 'listado-clientes', 
            component: ClientesComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'nuevo-cliente', 
            component: NuevoClienteComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'consulta-verified', 
            component: ProductoDetalleComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          
          // Configuraciones de ficha cliente
          {
            path: 'tipo-cliente',
            canActivate: [PermissionGuard],  // 🔒 GUARD APLICADO AL PADRE
            children: [
              { path: '', component: TipoClienteListComponent, canActivate: [PermissionGuard]},
              { path: 'crear', component: TipoClienteFormComponent,canActivate: [PermissionGuard] },
              { path: 'editar/:id', component: TipoClienteFormComponent,canActivate: [PermissionGuard] }
            ]
          },
          {
            path: 'grupo-cliente',
            canActivate: [PermissionGuard],  // 🔒 GUARD APLICADO AL PADRE
            children: [
              { path: '', component: GrupoClienteListComponent ,canActivate: [PermissionGuard]},
              { path: 'crear', component: GrupoClienteFormComponent,canActivate: [PermissionGuard] },
              { path: 'editar/:id', component: GrupoClienteFormComponent,canActivate: [PermissionGuard] }
            ]
          }
        ]
      },

      // ✅ MÓDULO: Reportes - CON GUARDS APLICADOS
      {
        path: 'reportes',
        children: [
          { path: '', redirectTo: 'explorador-cliente', pathMatch: 'full' },
          { 
            path: 'explorador-cliente', 
            component: ExploradorComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'gerencia', 
            component: GerenciaComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'gerenciate', 
            component: GerenciaEmpresasComponent
          }
          ,
          { 
            path: 'datamatrix', 
            component: Gs1ScannerComponent
          },
           { 
            path: 'gerenciafactuacion', 
            component: DashboardFacturacionComponent
          }
        ]
      },

      // ✅ MÓDULO: Transferencia - CON GUARDS APLICADOS
      {
        path: 'transferencia',
        children: [
          { path: '', redirectTo: 'tras-prefijo', pathMatch: 'full' },
          { 
            path: 'tras-prefijo', 
            component: TraspasoPrefijosComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'tras-gtin', 
            component: TraspasoGtinComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'eliminar-prefijo', 
            component: BorrarPrefijoComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          }        
        ]
      },

      // ✅ MÓDULO: Validación - CON GUARDS APLICADOS
      {
        path: 'validacion',
        children: [
          { path: '', redirectTo: 'validacionsri', pathMatch: 'full' },
          { 
            path: 'validacionsri', 
            component: ValidacionSriListComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'validacion-licenses', 
            component: LicenseValidatorComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'validacion-productos', 
            component: ProductsLicenseValidator,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          }
        ]
      },

      // ✅ MÓDULO: Configuración General - CON GUARDS APLICADOS
      {
        path: 'configuracion',
        children: [
          { path: '', redirectTo: 'localizacion-establecimiento', pathMatch: 'full' },
          {
            path: 'localizacion-establecimiento',
            canActivate: [PermissionGuard],  // 🔒 GUARD APLICADO AL PADRE
            children: [
              { path: '', component: TipoLocalizacionListComponent ,canActivate: [PermissionGuard]},
              { path: 'crear', component: TipoLocalizacionFormComponent,canActivate: [PermissionGuard] },
              { path: 'editar/:id', component: TipoLocalizacionFormComponent,canActivate: [PermissionGuard]}
            ]
          },
          {
            path: 'grupo-producto',
            component: GrupoProductoListaComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          },
          { 
            path: 'tipo-prefijo', 
            component: TipoPrefijoComponent,
            canActivate: [PermissionGuard]  // 🔒 GUARD APLICADO
          }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MenusRoutingModule { }