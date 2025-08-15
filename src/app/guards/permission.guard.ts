import { Injectable, NgZone } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, NavigationEnd } from '@angular/router';
import { Observable, of, combineLatest, timer, Subject, NEVER } from 'rxjs';
import { map, take, timeout, catchError, switchMap, filter, startWith, distinctUntilChanged, shareReplay, tap, takeUntil } from 'rxjs/operators';
import { PermissionsService } from '../services/permission.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  
  // 🚨 SISTEMA DE MONITOREO EN TIEMPO REAL
  private rutaActualSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private monitoreandoRuta = false;
  private ultimaRutaVerificada = '';

  // 🎯 Cache de verificaciones para optimizar performance
  private verificacionesCache = new Map<string, Observable<boolean>>();
  
  constructor(
    private permissions: PermissionsService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.inicializarSistemaMonitoreo();
  }

  // 🚀 SISTEMA PRINCIPAL DE MONITOREO
  private inicializarSistemaMonitoreo(): void {
    console.log('🔄 Inicializando sistema de monitoreo en tiempo real...');

    // 1️⃣ Monitorear cambios de navegación
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => (event as NavigationEnd).url),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(ruta => {
      console.log(`🧭 Nueva ruta detectada: ${ruta}`);
      this.ultimaRutaVerificada = ruta;
      this.rutaActualSubject.next(ruta);
    });

    // 2️⃣ Monitorear cambios de permisos para la ruta actual
    combineLatest([
      this.rutaActualSubject.asObservable(),
      this.permissions.permisos$.pipe(distinctUntilChanged())
    ]).pipe(
      filter(([ruta, permisos]) => !!ruta && permisos.length > 0),
      switchMap(([ruta, permisos]) => {
        console.log(`🔍 Revalidando automáticamente: ${ruta}`);
        return this.revalidarRutaEnTiempoReal(ruta);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ ruta, tieneAcceso, motivo }) => {
        if (!tieneAcceso) {
          console.error(`🚨 ACCESO REVOCADO EN TIEMPO REAL para: ${ruta} - Motivo: ${motivo}`);
          this.expulsarUsuarioDeRuta(ruta, motivo);
        } else {
          console.log(`✅ Acceso confirmado en tiempo real para: ${ruta}`);
        }
      },
      error: (error) => {
        console.error('❌ Error en monitoreo en tiempo real:', error);
      }
    });

    // 3️⃣ Escuchar eventos de cambios de permisos
    this.escucharCambiosPermisos();
  }

  // 🔍 REVALIDACIÓN EN TIEMPO REAL
  private revalidarRutaEnTiempoReal(ruta: string): Observable<{ruta: string, tieneAcceso: boolean, motivo: string}> {
    return this.permissions.puedeAccederRuta$(ruta).pipe(
      take(1),
      map(tieneAcceso => ({
        ruta,
        tieneAcceso,
        motivo: tieneAcceso ? 'acceso-válido' : 'permiso-revocado'
      })),
      catchError(error => {
        console.error(`❌ Error revalidando ${ruta}:`, error);
        return of({
          ruta,
          tieneAcceso: false,
          motivo: 'error-revalidacion'
        });
      })
    );
  }

  // 🚨 EXPULSAR USUARIO CUANDO SE REVOQUE PERMISO
  private expulsarUsuarioDeRuta(ruta: string, motivo: string): void {
    console.error(`🚫 EXPULSANDO usuario de ${ruta} - Motivo: ${motivo}`);
    
    // Usar NgZone para asegurar que Angular detecte el cambio
    this.ngZone.run(() => {
      // Limpiar cache para evitar estados inconsistentes
      this.limpiarCache();
      
      // Navegar inmediatamente a página de sin permisos
      this.router.navigate(['/sin-permisos'], { 
        queryParams: { 
          rutaAnterior: ruta,
          motivo: 'permiso-revocado-tiempo-real',
          timestamp: new Date().getTime()
        },
        replaceUrl: true // Reemplazar en el historial para evitar que vuelva
      });
      
      // Mostrar notificación al usuario
      this.mostrarNotificacionExpulsion(ruta, motivo);
    });
  }

  // 🔔 NOTIFICACIÓN AL USUARIO
  private mostrarNotificacionExpulsion(ruta: string, motivo: string): void {
    // Aquí puedes integrar con tu sistema de notificaciones (toast, snackbar, etc.)
    const mensaje = 'Sus permisos han cambiado. Por seguridad, ha sido redirigido.';
    
    // Ejemplo con alert (reemplaza con tu sistema de notificaciones)
    setTimeout(() => {
      if (confirm(`${mensaje}\n\n¿Desea recargar la aplicación para actualizar completamente?`)) {
        window.location.reload();
      }
    }, 500);
  }

  // 🎧 ESCUCHAR CAMBIOS DE PERMISOS
  private escucharCambiosPermisos(): void {
    // Listener para el evento personalizado del servicio
    window.addEventListener('permisosChanged', (event: any) => {
      const cambios = event.detail;
      console.log('🔄 Cambios detectados en Guard:', cambios);
      
      // Si hay cambios, limpiar cache y forzar revalidación
      if (cambios.total_cambios > 0) {
        console.log('🚨 Cambios significativos detectados, iniciando revalidación...');
        this.limpiarCache();
        
        // Forzar revalidación de la ruta actual si está disponible
        if (this.ultimaRutaVerificada) {
          this.rutaActualSubject.next(this.ultimaRutaVerificada);
        }
      }
    });

    // También escuchar cambios directos en el observable de permisos
    this.permissions.permisos$.pipe(
      distinctUntilChanged(),
      filter(permisos => permisos.length > 0),
      takeUntil(this.destroy$)
    ).subscribe(permisos => {
      console.log(`🔄 Permisos actualizados directamente: ${permisos.length} permisos`);
      this.limpiarCache();
    });

    console.log('🎧 Listeners de cambios de permisos inicializados');
  }

  // 🚀 IMPLEMENTACIÓN PRINCIPAL DEL GUARD
  canActivate(
    route: ActivatedRouteSnapshot, 
    state: RouterStateSnapshot
  ): Observable<boolean> {
    
    const rutaCompleta = state.url;
    
    // EXCLUIR RUTAS QUE NO DEBEN SER PROTEGIDAS
    const rutasExcluidas = [
      '/sin-permisos',
      '/login',
      '/inicio',           // ← Ruta del botón salir
      '/dashboard',        // ← Rutas de inicio alternativas
      '/home',
      '/codbar/inicio',    // ← Página de inicio de CODBAR
      '/codbar',           // ← Página principal de CODBAR
    ];
    
    // Si es una ruta excluida, permitir acceso
    if (rutasExcluidas.some(ruta => rutaCompleta.startsWith(ruta))) {
      console.log(`✅ Ruta excluida, acceso permitido: ${rutaCompleta}`);
      return of(true);
    }
    
    console.log(`🔒 Guard verificando acceso a: ${rutaCompleta}`);
    
    // Actualizar ruta actual para monitoreo
    this.ultimaRutaVerificada = rutaCompleta;
    this.rutaActualSubject.next(rutaCompleta);
    
    // Verificación reactiva con monitoreo continuo
    return this.obtenerVerificacionReactiva(rutaCompleta).pipe(
      timeout(10000),
      take(1),
      tap(tieneAcceso => {
        if (tieneAcceso) {
          console.log(`✅ Acceso PERMITIDO a: ${rutaCompleta}`);
          this.iniciarMonitoreoContinuo(rutaCompleta);
        } else {
          console.warn(`❌ Acceso DENEGADO a: ${rutaCompleta}`);
          this.navegarASinPermisos(rutaCompleta, 'sin-permisos-inicial');
        }
      }),
      catchError(error => {
        console.error(`❌ Error en guard para ${rutaCompleta}:`, error);
        this.navegarASinPermisos(rutaCompleta, 'error-verificacion');
        return of(false);
      })
    );
  }

  // 🔄 MONITOREO CONTINUO DE LA RUTA ACTUAL
  private iniciarMonitoreoContinuo(ruta: string): void {
    if (this.monitoreandoRuta) {
      console.log(`🔄 Ya monitoreando ruta: ${ruta}`);
      return;
    }

    this.monitoreandoRuta = true;
    console.log(`🔄 Iniciando monitoreo continuo para: ${ruta}`);

    // Verificar permisos cada 30 segundos mientras esté en la ruta
    timer(0, 30000).pipe(
      filter(() => this.ultimaRutaVerificada === ruta), // Solo si seguimos en la misma ruta
      switchMap(() => this.permissions.puedeAccederRuta$(ruta)),
      distinctUntilChanged(),
      takeUntil(this.rutaActualSubject.pipe(
        filter(nuevaRuta => nuevaRuta !== ruta) // Parar cuando cambie de ruta
      )),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (tieneAcceso) => {
        if (!tieneAcceso) {
          console.error(`🚨 Permiso REVOCADO durante monitoreo continuo: ${ruta}`);
          this.expulsarUsuarioDeRuta(ruta, 'permiso-revocado-monitoreo');
        }
      },
      complete: () => {
        console.log(`🔄 Monitoreo continuo finalizado para: ${ruta}`);
        this.monitoreandoRuta = false;
      }
    });
  }

  // 🔄 VERIFICACIÓN REACTIVA CON CACHE
  private obtenerVerificacionReactiva(ruta: string): Observable<boolean> {
    if (this.verificacionesCache.has(ruta)) {
      return this.verificacionesCache.get(ruta)!;
    }

    const verificacion$ = combineLatest([
      this.permissions.permisosReady$,
      this.permissions.permisos$,
      this.permissions.loading$
    ]).pipe(
      filter(([ready, _p, loading]) => ready && !loading),
      switchMap(([_, permisos]) => permisos.length === 0
        ? of(false)
        : this.permissions.puedeAccederRuta$(ruta)
      ),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.verificacionesCache.set(ruta, verificacion$);
    return verificacion$;
  }

  // 🧹 LIMPIEZA DE CACHE
  private limpiarCache(): void {
    const tamanoAnterior = this.verificacionesCache.size;
    this.verificacionesCache.clear();
    console.log(`🧹 Cache limpiado (${tamanoAnterior} entradas)`);
  }

  // 🚦 NAVEGACIÓN A SIN PERMISOS
  private navegarASinPermisos(ruta: string, motivo: string): void {
    this.router.navigate(['/sin-permisos'], { 
      queryParams: { 
        ruta: ruta,
        motivo: motivo,
        timestamp: new Date().getTime()
      },
      replaceUrl: true
    });
  }

  // 🔄 FORZAR REVALIDACIÓN MANUAL
  public forzarRevalidacion(): void {
    console.log('🔄 Forzando revalidación manual...');
    this.limpiarCache();
    this.permissions.forzarRecargaPermisos();
    
    if (this.ultimaRutaVerificada) {
      this.rutaActualSubject.next(this.ultimaRutaVerificada);
    }
  }

  // 🧪 MÉTODO DE TESTING
  public simularCambioPermisos(): void {
    console.log('🧪 Simulando cambio de permisos...');
    this.limpiarCache();
    this.rutaActualSubject.next(this.ultimaRutaVerificada);
  }

  // 🔧 CLEANUP
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.rutaActualSubject.complete();
  }

  // 📊 ESTADO ACTUAL DEL GUARD
  public get estadoGuard() {
    return {
      rutaActual: this.ultimaRutaVerificada,
      monitoreando: this.monitoreandoRuta,
      cacheSize: this.verificacionesCache.size,
      estadoPermisos: this.permissions.estadoActual
    };
  }
}