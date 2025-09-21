// productos-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NavigationProductoComponent } from './navigation-producto/navigation-producto.component';
import { NuevoProductoComponent } from './nuevo-producto/nuevo-producto.component';
import { ClienteSeleccionadoComponent } from './cliente-seleccionado/cliente-seleccionado.component';
import { UvIndividualComponent } from './uv-individual/uv-individual.component';
import { UvIndividualEditComponent } from './uv-individual-edit/uv-individual-edit.component';
import { UlComponent } from './ul/ul.component';
import { UlEditComponent } from './ul-edit/ul-edit.component';
import { NuevoSsccComponent } from './nuevo-sscc/nuevo-sscc.component';
import { CuponesComponent } from './cupones/cupones.component';
import { GlnComponent } from './glns/gln-list/nuevo-gln.component';
import { BloqueComponent } from './bloque/bloque.component';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { PermissionGuard } from 'src/app/guards/permission.guard';

const routes: Routes = [
  {
    path: '',
    component: NavigationProductoComponent,
    canActivate: [AuthGuard],
    children: [
      { 
        path: '', 
        redirectTo: 'cliente-seleccion', // CAMBIAR A cliente-seleccion
        pathMatch: 'full' 
      },
      {
        path: 'cliente-seleccion',
        component: ClienteSeleccionadoComponent,
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes',
          breadcrumb: 'Cliente Selección'
        }
      },
      {
        path: 'nuevo-producto',
        component: NuevoProductoComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto',
          breadcrumb: 'Nuevo Producto'
        }
      },
      {
        path: 'nuevo-gln',
        component: GlnComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.nuevo-gln',
          breadcrumb: 'Nuevo GLN'
        }
      },
      {
        path: 'cupones',
        component: CuponesComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.cupones',
          breadcrumb: 'Cupones'
        }
      },
      {
        path: 'nuevo-sscc',
        component: NuevoSsccComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.nuevo-sscc',
          breadcrumb: 'Nuevo SSCC'
        }
      },
      {
        path: 'uv-individual',
        component: UvIndividualComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-uv',
          breadcrumb: 'UV Individual'
        }
      },
      {
        path: 'uv-individual-edit/:codbar',
        component: UvIndividualEditComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-uv',
          breadcrumb: 'Editar UV Individual'
        }
      },
      {
        path: 'ul/:codbar',
        component: UlComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-ul',
          breadcrumb: 'UL'
        }
      },
      {
        path: 'ul-edit/:g14',
        component: UlEditComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-ul',
          breadcrumb: 'Editar UL'
        }
      },
      {
        path: 'bloque',
        component: BloqueComponent,
        canActivate: [PermissionGuard],
        data: { 
          permission: 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.bloque',
          breadcrumb: 'Bloque'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductosRoutingModule { }