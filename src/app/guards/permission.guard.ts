// permission.guard.ts (actualizado)
import { Injectable, OnDestroy } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { map, take, timeout, catchError, takeUntil } from 'rxjs/operators';
import { PermissionsService } from '../services/permission.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate, OnDestroy {
 
  private destroy$ = new Subject<void>();
  private isNavigating = false;

  constructor(
    private permissions: PermissionsService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
   
    try {
      const rutaCompleta = state.url;
      
      // Prevenir múltiples navegaciones simultáneas
      if (this.isNavigating) {
        console.log('🔄 Navegación en progreso, cancelando...');
        return false;
      }

      // RUTAS QUE NO REQUIEREN VERIFICACIÓN
      const rutasLibres = [
        '/sin-permisos',
        '/login',
        '/inicio',
        '/dashboard',
        '/home',
      ];
      
      // Si es una ruta libre, permitir acceso inmediatamente
      if (this.esRutaLibre(rutaCompleta, rutasLibres)) {
        console.log(`✅ Ruta libre, acceso permitido: ${rutaCompleta}`);
        return true;
      }
      
      // NUEVA LÓGICA: Usar datos de la ruta si están disponibles
      const permisoRequerido = route.data?.['permission'];
      
      if (permisoRequerido) {
        console.log(`🔒 Verificando permiso específico: ${permisoRequerido} para ruta: ${rutaCompleta}`);
        return this.verificarPermisoEspecifico(permisoRequerido, rutaCompleta);
      }
      
      // Fallback: usar la ruta completa (comportamiento anterior)
      console.log(`🔒 Verificando permisos para ruta: ${rutaCompleta}`);
      return this.verificarPermisosSeguro(rutaCompleta);
     
    } catch (error) {
      console.error('❌ Error crítico en PermissionGuard:', error);
      return this.manejarErrorCritico(state.url);
    }
  }

  // NUEVO MÉTODO: Verificar permiso específico desde route.data
  private verificarPermisoEspecifico(permission: string, ruta: string): Observable<boolean> {
    this.isNavigating = true;
    
    return this.permissions.permisos$.pipe(
      timeout(8000),
      take(1),
      map(permisos => {
        this.isNavigating = false;
        
        const tieneAcceso = permisos.includes(permission);
        
        if (tieneAcceso) {
          console.log(`Acceso PERMITIDO - Permiso: ${permission}`);
          return true;
        } else {
          console.warn(`❌ Acceso DENEGADO - Permiso requerido: ${permission}`);
          this.navegarASinPermisosSafe(ruta, `sin-permisos-permiso:${permission}`);
          return false;
        }
      }),
      catchError(error => {
        this.isNavigating = false;
        console.error(`❌ Error verificando permiso específico ${permission}:`, error);
        return this.manejarErrorVerificacion(ruta, error);
      }),
      takeUntil(this.destroy$)
    );
  }

  private verificarPermisosSeguro(ruta: string): Observable<boolean> {
    this.isNavigating = true;
    return this.permissions.puedeAccederRuta$(ruta).pipe(
      timeout(8000),
      take(1),
      map(tieneAcceso => {
        this.isNavigating = false;
       
        if (tieneAcceso) {
          console.log(`✅ Acceso PERMITIDO a: ${ruta}`);
          return true;
        } else {
          console.warn(`❌ Acceso DENEGADO a: ${ruta}`);
          this.navegarASinPermisosSafe(ruta);
          return false;
        }
      }),
      catchError(error => {
        this.isNavigating = false;
        console.error(`❌ Error verificando permisos para ${ruta}:`, error);
        return this.manejarErrorVerificacion(ruta, error);
      }),
      takeUntil(this.destroy$)
    );
  }

  private manejarErrorVerificacion(ruta: string, error: any): Observable<boolean> {
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      console.warn('⏰ Timeout verificando permisos, permitiendo acceso temporal');
      return of(true);
    }
    
    console.error('❌ Error grave verificando permisos, denegando acceso');
    this.navegarASinPermisosSafe(ruta);
    return of(false);
  }

  private manejarErrorCritico(ruta: string): boolean {
    console.error('🚨 Error crítico en guard, redirigiendo a inicio');
   
    setTimeout(() => {
      this.router.navigate(['/inicio']).catch(navError => {
        console.error('❌ Error navegando a inicio:', navError);
        window.location.href = '/inicio';
      });
    }, 100);
   
    return false;
  }

  private esRutaLibre(ruta: string, rutasLibres: string[]): boolean {
    return rutasLibres.some(rutaLibre => {
      if (ruta === rutaLibre) return true;
      if (ruta.startsWith(rutaLibre + '/')) return true;
      if (ruta.startsWith(rutaLibre + '?')) return true;
      return false;
    });
  }

  private navegarASinPermisosSafe(ruta: string, motivo: string = 'sin-permisos'): void {
    try {
      setTimeout(() => {
        if (!this.isNavigating) {
          this.isNavigating = true;
         
          this.router.navigate(['/sin-permisos'], {
            queryParams: {
              ruta: ruta,
              motivo: motivo,
              timestamp: new Date().getTime()
            },
            replaceUrl: true
          }).then(
            (success) => {
              this.isNavigating = false;
              if (success) {
                console.log(`Redirigido a sin-permisos desde: ${ruta}`);
              } else {
                console.warn('⚠️ Falló la navegación a sin-permisos');
              }
            }
          ).catch(error => {
            this.isNavigating = false;
            console.error('❌ Error navegando a sin-permisos:', error);
            this.router.navigate(['/inicio']).catch(() => {
              window.location.href = '/inicio';
            });
          });
        }
      }, 50);
     
    } catch (error) {
      this.isNavigating = false;
      console.error('❌ Error en navegación segura:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.isNavigating = false;
  }
}