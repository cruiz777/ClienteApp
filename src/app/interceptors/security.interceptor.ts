import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, filter, catchError } from 'rxjs/operators';
import { PermissionsService } from '../services/permission.service';
import { Router } from '@angular/router';

@Injectable()
export class SecurityInterceptor implements HttpInterceptor {

  constructor(
    private permissions: PermissionsService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    return next.handle(req).pipe(
      tap(event => {
        // Solo procesar si es una HttpResponse
        if (!(event instanceof HttpResponse)) {
          return;
        }
        
        const response = event as HttpResponse<any>;
        
        // 🔍 Detectar respuestas que indican cambios de permisos
        if (this.esRespuestaDePermisos(req.url) || this.indicaCambioPermisos(response)) {
          console.log('🔄 Respuesta indica posible cambio de permisos, forzando recarga...');
          
          // Pequeño delay para permitir que la respuesta se procese
          setTimeout(() => {
            this.permissions.forzarRecargaPermisos();
          }, 100);
        }

        // 🚨 Detectar errores de autorización que requieren acción inmediata
        if (response.status === 401 || response.status === 403) {
          console.error('🚨 Error de autorización detectado, limpiando sesión...');
          this.manejarErrorAutorizacion();
        }

        // 🔍 Revisar headers de seguridad personalizados
        const headerPermisos = response.headers.get('X-Permissions-Changed');
        if (headerPermisos === 'true') {
          console.log('🔄 Header indica cambio de permisos, recargando...');
          this.permissions.forzarRecargaPermisos();
        }

      }),
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401 || err.status === 403) {
            this.manejarErrorAutorizacion();
            }
            return throwError(() => err);
        })
    );

  }

    private esRespuestaDePermisos(url: string): boolean {
    // SOLO recargar para endpoints que NO sean la consulta de permisos
    return (url.includes('/roles') || url.includes('/profiles')) && 
            !url.includes('/permisos'); // Excluir explícitamente el endpoint de permisos
    }

  private indicaCambioPermisos(response: HttpResponse<any>): boolean {
    const body = response.body;
    
    // Detectar cambios en el cuerpo de la respuesta
    if (body && typeof body === 'object') {
      return body.hasOwnProperty('permisos_changed') ||
             body.hasOwnProperty('role_updated') ||
             body.hasOwnProperty('profile_modified')
    }
    
    return false;
  }

  private manejarErrorAutorizacion(): void {
    // Limpiar permisos y sesión
    this.permissions.limpiarPermisos();
    
    // Redirigir a login o página de error
    this.router.navigate(['/login'], {
      queryParams: { 
        motivo: 'sesion-expirada',
        timestamp: new Date().getTime()
      }
    });
  }
}