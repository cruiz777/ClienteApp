import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeguridadesComponent } from './seguridades.component';
import { SeguridadesInicioComponent } from './inicio/inicio.component';
import { PermissionGuard } from '../../guards/permission.guard';
import { AuthGuard } from '../../guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: SeguridadesComponent, // Layout principal de SEGURIDADES
    canActivate: [AuthGuard], // Solo verificar autenticación al nivel padre
    children: [
      // Página de inicio de SEGURIDADES (sin guard de permisos)
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: SeguridadesInicioComponent },

      // MÓDULO: Usuarios/Perfiles - CON GUARDS APLICADOS
      {
        path: 'usuarios',
        loadChildren: () => import('./usuarios/usuarios.module').then(m => m.UsuariosModule),
        canActivate: [PermissionGuard] // GUARD APLICADO
      },
      {
        path: 'perfiles',
        loadChildren: () => import('./perfiles/perfiles.module').then(m => m.PerfilesModule),
        canActivate: [PermissionGuard] // GUARD APLICADO
      },
      {
        path: 'departamentos',
        loadChildren: () => import('./departamentos/departamentos.module').then(m => m.DepartamentosModule),
        canActivate: [PermissionGuard] // GUARD APLICADO
      },

      // MÓDULO: Entidades - CON GUARDS APLICADOS
      {
        path: 'entidades',
        loadChildren: () => import('./entidades/entidad.module').then(m => m.EntidadModule),
        canActivate: [PermissionGuard] // GUARD APLICADO
      },

      // MÓDULO: Configuración - CON GUARDS APLICADOS
      {
        path: 'empresas',
        loadChildren: () => import('./empresas/empresa.module').then(m => m.EmpresasModule),
        canActivate: [PermissionGuard] // GUARD APLICADO
      },
      {
        path: 'zonas',
        loadChildren: () => import('./zona/zona.module').then(m => m.ZonaModule),
        canActivate: [PermissionGuard] // GUARD APLICADO
      },
      {
        path: 'proyectos',
        loadChildren: () => import('./configuracion/proyecto/proyecto.module').then(m => m.ProyectoModule),
        canActivate: [PermissionGuard] // GUARD APLICADO
      },
      {
        path: 'segmento-negocio',
        loadChildren: () => import('./configuracion/segment-negocio/segmento-negocio.module').then(m => m.SegmentoNegocioModule),
        canActivate: [PermissionGuard] // GUARD APLICADO
      },
      {
        path: 'videos',
        loadChildren: () => import('./configuracion/videos-ayuda/videos-ayuda.module').then(m => m.VideosAyudaModule),
        canActivate: [PermissionGuard],
        data: { permission: 'seguridades.configuracion.videos.ver' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeguridadesRoutingModule { }
