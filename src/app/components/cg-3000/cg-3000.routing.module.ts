import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { PermissionGuard } from 'src/app/guards/permission.guard';
import { NavigationCgComponent } from './navigation-cg/navigation-cg.component';
import { TipcuentaComponent } from '../sic-3000/tipocuenta/tipcuenta/tipcuenta.component';
import { InicioCgComponent } from './inicio-cg/inicio-cg.component';


const routes: Routes = [
  {
    path: '',
    component: NavigationCgComponent,
    canActivate: [AuthGuard], // 🔐 Proteger toda la sección con autenticación
    children: [
      // Redirige a la ruta que sí existe
      { path: '', redirectTo: 'inicio-cg', pathMatch: 'full' },
      
      // INICIO - Solo requiere acceso al módulo
      { 
        path: 'inicio-cg', 
        component: InicioCgComponent
      },
      
      { path: 'tipocuenta', component: TipcuentaComponent },
   
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Cg3000RoutingModule {}