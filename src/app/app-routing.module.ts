import { UvIndividualComponent } from './components/productos/uv-individual/uv-individual.component';
import { NavigationComponent } from './components/seguridades/navigation/navigation.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { NavigationProductoComponent} from './components/productos/navigation-producto/navigation-producto.component';
import { NuevoProductoComponent } from './components/productos/nuevo-producto/nuevo-producto.component';
import { AuthGuard } from './guards/auth.guard';
import { ClienteSeleccionadoComponent } from './components/productos/cliente-seleccionado/cliente-seleccionado.component';
import { GlnComponent } from './components/productos/glns/gln-list/nuevo-gln.component';
import { BloqueComponent } from './components/productos/bloque/bloque.component';

const routes: Routes = [
  {path:'',redirectTo:'login',pathMatch:'full'},
  {path: 'login', component: LoginComponent },
  {path:'inicio',component:InicioComponent},

  {path: 'menus', loadChildren: () => import('./components/menus/menus.module').then(x => x.MenusModule) },
  {path: 'pages', loadChildren: () => import('./components/pages/pages.module').then(x => x.PagesModule) },

  {path: 'seguridades', loadChildren: () => import('./components/seguridades/seguridades.module').then(m => m.SeguridadesModule) },
  {
  path: 'productos',
  loadChildren: () => import('./components/productos/productos-routing.module').then(m => m.ProductosRoutingModule)
},
{
  path: 'menuProductos',
  component: NavigationProductoComponent,
  children: [
    { path: '', redirectTo: 'nuevoProducto', pathMatch: 'full' },
    { path: 'nuevoProducto', component: NuevoProductoComponent },
    { path: 'clienteSeleccion', component: ClienteSeleccionadoComponent},
    { path: 'uvIndividual', component: UvIndividualComponent },
    { path: 'nuevoGln', component: GlnComponent },
    { path: 'bloque', component: BloqueComponent }
   ]
},

  {path:'**',component:NotFoundComponent,pathMatch:'full'}

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
