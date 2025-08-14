import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CodbarComponent } from './codbar/codbar.component';
import { MenusComponent } from './menus.component';

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

const routes: Routes = [
  {
    path: '', 
    component: MenusComponent, // Layout principal de CODBAR
    children: [
      // ✅ Página de inicio de CODBAR
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: CodbarComponent },

      // ✅ MÓDULO: Ficha de Cliente - COMPLETAMENTE INTEGRADO
      {
        path: 'ficha-de-cliente',
        children: [
          // Dashboard/inicio de ficha cliente
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          
          // 🆕 Funcionalidades principales (de pages)
          { path: 'listado-clientes', component: ClientesComponent },
          { path: 'nuevo-cliente', component: NuevoClienteComponent },
          { path: 'consulta-verified', component: ProductoDetalleComponent },
          
          // 🆕 FUTURO: Explorador de clientes
          // { path: 'explorador-clientes', component: ExploradorClientesComponent },
          
          // Configuraciones de ficha cliente
          {
            path: 'tipo-cliente',
            children: [
              { path: '', component: TipoClienteListComponent },
              { path: 'crear', component: TipoClienteFormComponent },
              { path: 'editar/:id', component: TipoClienteFormComponent }
            ]
          },
          {
            path: 'grupo-cliente',
            children: [
              { path: '', component: GrupoClienteListComponent },
              { path: 'crear', component: GrupoClienteFormComponent },
              { path: 'editar/:id', component: GrupoClienteFormComponent }
            ]
          }
        ]
      },

      // ✅ MÓDULO: Reportes 
      {
        path: 'reportes',
        children: [
          { path: '', redirectTo: 'explorador-cliente', pathMatch: 'full' },
          { path: 'explorador-cliente', component: ExploradorComponent },
          { path: 'gerencia', component: GerenciaComponent }
          // 🆕 Futuros reportes se pueden agregar aquí
          // { path: 'reporte-ventas', component: ReporteVentasComponent },
          // { path: 'reporte-productos', component: ReporteProductosComponent },
        ]
      },

      // ✅ MÓDULO: Transferencia
      {
        path: 'transferencia',
        children: [
          { path: '', redirectTo: 'tras-prefijo', pathMatch: 'full' },
          { path: 'tras-prefijo', component: TraspasoPrefijosComponent },
          { path: 'tras-gtin', component: TraspasoGtinComponent },
          { path: 'eliminar-prefijo', component: BorrarPrefijoComponent },          
        ]
      },

      // ✅ MÓDULO: Validación
      {
        path: 'validacion',
        children: [
          { path: '', redirectTo: 'validacionsri', pathMatch: 'full' },
          { path: 'validacionsri', component: ValidacionSriListComponent },
          { path: 'validacion-licenses', component: LicenseValidatorComponent },
          { path: 'validacion-productos', component: ProductsLicenseValidator }
        ]
      },

      // ✅ MÓDULO: Configuración General
      {
        path: 'configuracion',
        children: [
          { path: '', redirectTo: 'localizacion-establecimiento', pathMatch: 'full' },
          {
            path: 'localizacion-establecimiento',
            children: [
              { path: '', component: TipoLocalizacionListComponent },
              { path: 'crear', component: TipoLocalizacionFormComponent },
              { path: 'editar/:id', component: TipoLocalizacionFormComponent }
            ]
          },
          {path:'grupo-producto',component:GrupoProductoListaComponent},
          { path: 'tipo-prefijo', component: TipoPrefijoComponent }
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