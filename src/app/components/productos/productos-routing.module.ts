import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductosComponent } from './productos.component';


const routes: Routes = [
  {
    path: '',
    component: ProductosComponent,
    children: [
      {
        path: 'NuevoProducto',
        loadComponent: () => import('./nuevo-producto/nuevo-producto.component').then(m => m.NuevoProductoComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductosRoutingModule { }
