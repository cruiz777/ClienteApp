import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, timeout, catchError, switchMap, filter } from 'rxjs/operators';
import { PermissionsService } from '../services/permission.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  
  constructor(
    private permissions: PermissionsService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot, 
    state: RouterStateSnapshot
  ): Observable<boolean> {
    
    const rutaCompleta = state.url;
    
    console.log(`🔒 Guard verificando acceso a: ${rutaCompleta}`);
    
    // 🚀 Estrategia: Esperar a que los permisos estén listos, luego verificar
    return this.permissions.permisosReady$.pipe(
      // 🎯 Filtrar solo cuando los permisos estén realmente listos
      filter(ready => ready === true),
      
      // ⏱️ Timeout de 15 segundos para evitar esperas infinitas
      timeout(15000),
      
      // 🎯 Tomar solo el primer valor válido
      take(1),
      
      // 🔍 Una vez listos, verificar acceso usando el observable reactivo
      switchMap(() => this.permissions.puedeAccederRuta$(rutaCompleta)),
      
      // 🎯 Tomar la primera verificación
      take(1),
      
      // 🔍 Procesar resultado
      map(tieneAcceso => {
        if (!tieneAcceso) {
          console.warn(`❌ Acceso DENEGADO a: ${rutaCompleta}`);
          this.navegarASinPermisos(rutaCompleta, 'sin-permisos');
          return false;
        }
        
        console.log(`✅ Acceso PERMITIDO a: ${rutaCompleta}`);
        return true;
      }),
      
      // 🚨 Manejo de errores y timeouts
      catchError(error => {
        console.error(`❌ Error en guard para ${rutaCompleta}:`, error);
        
        if (error.name === 'TimeoutError') {
          console.error('⏱️ Timeout esperando permisos');
          this.navegarASinPermisos(rutaCompleta, 'timeout-permisos');
        } else {
          this.navegarASinPermisos(rutaCompleta, 'error-verificacion');
        }
        
        return of(false);
      })
    );
  }

  // 🚀 MÉTODO ALTERNATIVO: Para casos donde ya sabemos que los permisos están listos
  canActivateSync(
    route: ActivatedRouteSnapshot, 
    state: RouterStateSnapshot
  ): Observable<boolean> {
    
    const rutaCompleta = state.url;
    
    // Verificación directa si los permisos ya están cargados
    const estadoActual = this.permissions.estadoActual;
    
    if (estadoActual.listos) {
      const tieneAcceso = this.permissions.puedeAccederRuta(rutaCompleta);
      
      if (!tieneAcceso) {
        console.warn(`❌ Acceso denegado (sync) a: ${rutaCompleta}`);
        this.navegarASinPermisos(rutaCompleta, 'sin-permisos-sync');
        return of(false);
      }
      
      console.log(`✅ Acceso permitido (sync) a: ${rutaCompleta}`);
      return of(true);
    }
    
    // Si no están listos, usar método asíncrono
    return this.canActivate(route, state);
  }

  // 🚦 Navegación centralizada a página de sin permisos
  private navegarASinPermisos(ruta: string, motivo: string): void {
    this.router.navigate(['/sin-permisos'], { 
      queryParams: { 
        ruta: ruta,
        motivo: motivo,
        timestamp: new Date().getTime()
      },
      replaceUrl: true // No agregar a historial
    });
  }
}