import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, combineLatest, EMPTY, timer } from 'rxjs';
import { switchMap, catchError, distinctUntilChanged, filter, tap, debounceTime, map, shareReplay, startWith, delay, retryWhen, scan } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { UsuarioService } from './usuario.service';
import { LoginUsuarioResponse } from '../interfaces/responses/usuario-log-response';

export interface PermisosResponse {
  id: string;
  type: string;
  data: {
    permisos: any;
    permisos_flat: string[];
    id_usuario: number;
    id_perfil: number;
    perfil: string;
    id_empresa: number;
    empresa: string;
  };
  message: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  
  // 🎯 Estados reactivos principales
  private permisosSubject = new BehaviorSubject<string[]>([]);
  private permisosReadySubject = new BehaviorSubject<boolean>(false);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private forceRefreshSubject = new BehaviorSubject<number>(0);

  // 📡 Observables públicos
  public permisos$ = this.permisosSubject.asObservable();
  public permisosReady$ = this.permisosReadySubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  // ⏱️ Configuración
  private autoRefreshInterval = 5 * 60 * 1000; // 5 minutos
  private maxRetries = 3;

  // 🗺️ Mapeo de rutas a permisos
  private readonly MAPEO_RUTAS: Record<string, string> = {
    // Ficha de Cliente
    '/codbar/ficha-de-cliente/nuevo-cliente': 'codbar.ficha-de-cliente.nuevo-cliente.nuevo-cliente',
    '/codbar/ficha-de-cliente/listado-clientes': 'codbar.ficha-de-cliente.listado-clientes.listado-clientes',
    '/codbar/ficha-de-cliente/consulta-verified': 'codbar.ficha-de-cliente.consulta-verified.consulta-verified',
    '/codbar/ficha-de-cliente/tipo-cliente': 'codbar.ficha-de-cliente.tipo-cliente.tipo-cliente',
    '/codbar/ficha-de-cliente/tipo-cliente/crear': 'codbar.ficha-de-cliente.tipo-cliente.tipo-cliente',
    '/codbar/ficha-de-cliente/tipo-cliente/editar': 'codbar.ficha-de-cliente.tipo-cliente.tipo-cliente',
    '/codbar/ficha-de-cliente/grupo-cliente': 'codbar.ficha-de-cliente.grupo-cliente.grupo-cliente',
    '/codbar/ficha-de-cliente/grupo-cliente/crear': 'codbar.ficha-de-cliente.grupo-cliente.grupo-cliente',
    '/codbar/ficha-de-cliente/grupo-cliente/editar': 'codbar.ficha-de-cliente.grupo-cliente.grupo-cliente',
    
    // Transferencia
    '/codbar/transferencia/tras-prefijo': 'codbar.transferencia.tras-prefijo.tras-prefijo',
    '/codbar/transferencia/tras-gtin': 'codbar.transferencia.tras-gtin.tras-gtin',
    '/codbar/transferencia/eliminar-prefijo': 'codbar.transferencia.eliminar-prefijo.eliminar-prefijo',
    
    // Validación
    '/codbar/validacion/validacionsri': 'codbar.validacion.validacionsri.validacionsri',
    '/codbar/validacion/validacion-licenses': 'codbar.validacion.validacion-licenses.validacion-licenses',
    '/codbar/validacion/validacion-productos': 'codbar.validacion.validacion-productos.validacion-productos',
    
    // Reportes
    '/codbar/reportes/explorador-cliente': 'codbar.reportes.explorador-cliente.explorador-cliente',
    '/codbar/reportes/gerencia': 'codbar.reportes.gerencia.gerencia',
    
    // Configuración
    '/codbar/configuracion/localizacion-establecimiento': 'codbar.configuracion.localizacion-establecimiento.localizacion-establecimiento',
    '/codbar/configuracion/localizacion-establecimiento/crear': 'codbar.configuracion.localizacion-establecimiento.localizacion-establecimiento',
    '/codbar/configuracion/localizacion-establecimiento/editar': 'codbar.configuracion.localizacion-establecimiento.localizacion-establecimiento',
    '/codbar/configuracion/grupo-producto': 'codbar.configuracion.grupo-producto.grupo-producto',
    '/codbar/configuracion/tipo-prefijo': 'codbar.configuracion.tipo-prefijo.tipo-prefijo'
  };

  constructor(
    private http: HttpClient,
    private usuarioService: UsuarioService
  ) {
    this.inicializarSistemaReactivo();
  }

  // 🚀 SISTEMA REACTIVO PRINCIPAL
  private inicializarSistemaReactivo(): void {
    console.log('🔄 Inicializando sistema reactivo de permisos...');
    
    // 1. Cargar permisos desde storage al iniciar
    this.cargarPermisosDesdeStorage();

    // 2. Crear triggers para recarga automática
    const autoRefresh$ = interval(this.autoRefreshInterval).pipe(
      startWith(0), // Ejecutar inmediatamente
      debounceTime(1000)
    );

    const forceRefresh$ = this.forceRefreshSubject.pipe(
      distinctUntilChanged(),
      filter(count => count > 0)
    );

    const userChange$ = this.usuarioService.currentUser$.pipe(
      distinctUntilChanged((prev, curr) => {
        // Solo recargar si cambió el usuario o la empresa
        if (!prev && !curr) return true;
        if (!prev || !curr) return false;
        return prev.id_usuario === curr.id_usuario && prev.id_empresa === curr.id_empresa;
      })
    );

    // 3. Combinar todos los triggers
    const triggers$ = combineLatest([
      userChange$,
      forceRefresh$.pipe(startWith(0)),
      autoRefresh$.pipe(startWith(0))
    ]).pipe(
      // Solo procesar si hay usuario
      filter(([usuario]) => !!usuario),
      // Evitar múltiples llamadas simultáneas
      debounceTime(500),
      shareReplay(1)
    );

    // 4. Reaccionar a los triggers y cargar permisos
    triggers$.pipe(
      tap(([usuario]) => {
        console.log('🔄 Trigger detectado, cargando permisos para:', usuario?.nombre_usuario);
      }),
      switchMap(([usuario]) => this.cargarPermisosAsync(usuario!)),
      catchError(error => {
        console.error('❌ Error en sistema reactivo:', error);
        this.errorSubject.next('Error en sistema de permisos');
        return EMPTY;
      })
    ).subscribe({
      next: (permisos) => {
        console.log('✅ Permisos actualizados reactivamente:', permisos.length);
      },
      error: (error) => {
        console.error('❌ Error en suscripción reactiva:', error);
      }
    });

    // 5. Limpiar permisos cuando no hay usuario
    this.usuarioService.currentUser$.pipe(
      filter(usuario => !usuario)
    ).subscribe(() => {
      console.log('👤 Usuario deslogueado, limpiando permisos...');
      this.limpiarPermisos();
    });
  }

    // 🔄 CARGA ASÍNCRONA CON RETRY
    private cargarPermisosAsync(usuario: LoginUsuarioResponse): Observable<string[]> {
        this.loadingSubject.next(true);
        this.errorSubject.next(null);

        return this.http.get<PermisosResponse>(
            `${environment.applicationUrl}/Usuarios/${usuario.id_usuario}/permisos`
        ).pipe(
            // Retry automático con retryWhen
            retryWhen(errors => 
            errors.pipe(
                scan((retryCount, error) => {
                console.warn(`⚠️ Intento ${retryCount + 1} falló, reintentando...`, error);
                if (retryCount >= this.maxRetries) {
                    throw error;
                }
                return retryCount + 1;
                }, 0),
                delay(1000) // Esperar 1 segundo entre reintentos
            )
            ),
            
            // Procesar respuesta
            tap(response => {
            if (response?.type === 'OK' && response.data?.permisos_flat) {
                const nuevosPermisos = response.data.permisos_flat;
                
                // Detectar cambios
                const permisosActuales = this.permisosSubject.value;
                const cambios = this.detectarCambiosPermisos(permisosActuales, nuevosPermisos);
                
                if (cambios.total_cambios > 0) {
                console.log('🔄 Cambios en permisos detectados:', cambios);
                
                // Emitir evento personalizado para componentes que necesiten reaccionar
                this.emitirEventoCambioPermisos(cambios);
                }

                // Actualizar estados
                this.permisosSubject.next([...nuevosPermisos]);
                this.permisosReadySubject.next(true);
                
                // Guardar en storage
                this.guardarPermisosEnStorage(nuevosPermisos, usuario);
                
                console.log('✅ Permisos cargados para:', usuario.nombre_usuario, nuevosPermisos);
            } else {
                throw new Error('Respuesta de permisos inválida');
            }
            }),
            
            // Retornar los permisos
            map(response => response.data.permisos_flat),
            
            // Manejo de errores final
            catchError(error => {
            console.error('❌ Error final cargando permisos:', error);
            this.errorSubject.next(`Error cargando permisos: ${error.message}`);
            throw error;
            }),
            
            // Limpiar loading
            tap(() => this.loadingSubject.next(false))
        );
        }

  // 🔍 DETECTAR CAMBIOS EN PERMISOS
  private detectarCambiosPermisos(anteriores: string[], nuevos: string[]): any {
    const agregados = nuevos.filter(p => !anteriores.includes(p));
    const removidos = anteriores.filter(p => !nuevos.includes(p));
    
    return {
      agregados,
      removidos,
      total_cambios: agregados.length + removidos.length,
      timestamp: new Date().toISOString()
    };
  }

  // 📡 EMITIR EVENTO PERSONALIZADO
  private emitirEventoCambioPermisos(cambios: any): void {
    const evento = new CustomEvent('permisosChanged', {
      detail: cambios
    });
    window.dispatchEvent(evento);
  }

  // 💾 GUARDAR EN STORAGE
  private guardarPermisosEnStorage(permisos: string[], usuario: LoginUsuarioResponse): void {
    try {
      const data = {
        permisos_flat: permisos,
        usuario_id: usuario.id_usuario,
        empresa_id: usuario.id_empresa,
        timestamp: new Date().getTime(),
        version: '3.0'
      };
      
      localStorage.setItem('userPermissions', JSON.stringify(data));
      console.log('💾 Permisos guardados en storage para:', usuario.nombre_usuario);
    } catch (error) {
      console.error('❌ Error guardando permisos:', error);
    }
  }

  // 📱 MÉTODOS PÚBLICOS
  public forzarRecargaPermisos(): void {
    console.log('🔄 Forzando recarga manual de permisos...');
    this.forceRefreshSubject.next(this.forceRefreshSubject.value + 1);
  }

  public recargarPermisosManual(): Observable<string[]> {
    const usuario = this.usuarioService.getUsuarioActual();
    if (!usuario) {
      const error = 'No hay usuario logueado para recargar permisos';
      this.errorSubject.next(error);
      throw new Error(error);
    }
    
    console.log('🔄 Recarga manual solicitada para:', usuario.nombre_usuario);
    return this.cargarPermisosAsync(usuario);
  }

  // 🔒 VERIFICACIÓN REACTIVA DE PERMISOS
  public puedeAccederRuta$(rutaAngular: string): Observable<boolean> {
    return this.permisos$.pipe(
      map(permisos => this.verificarAccesoRuta(rutaAngular, permisos)),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  public puedeEjecutarAccion$(rutaAngular: string, accion: string): Observable<boolean> {
    return this.permisos$.pipe(
      map(permisos => this.verificarAccesoAccion(rutaAngular, accion, permisos)),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  // 🔒 VERIFICACIÓN SÍNCRONA (compatibilidad)
  public puedeAccederRuta(rutaAngular: string): boolean {
    return this.verificarAccesoRuta(rutaAngular, this.permisosSubject.value);
  }

  public puedeEjecutarAccion(rutaAngular: string, accion: string): boolean {
    return this.verificarAccesoAccion(rutaAngular, accion, this.permisosSubject.value);
  }

  // 🔧 MÉTODOS DE VERIFICACIÓN
  private verificarAccesoRuta(rutaAngular: string, permisos: string[]): boolean {
    const rutaNormalizada = this.normalizarRuta(rutaAngular);
    const permisoBase = this.MAPEO_RUTAS[rutaNormalizada];
    
    if (!permisoBase) {
      console.warn(`⚠️ Sin mapeo para ruta: ${rutaNormalizada}`);
      return false;
    }

    const tienePermiso = permisos.some(permiso => permiso.startsWith(permisoBase));
    console.log(`🔍 Ruta ${rutaNormalizada}: ${tienePermiso ? '✅' : '❌'}`);
    return tienePermiso;
  }

  private verificarAccesoAccion(rutaAngular: string, accion: string, permisos: string[]): boolean {
    const rutaNormalizada = this.normalizarRuta(rutaAngular);
    const permisoBase = this.MAPEO_RUTAS[rutaNormalizada];
    
    if (!permisoBase) return false;

    const permisoCompleto = `${permisoBase}.${accion}`;
    const puedeEjecutar = permisos.includes(permisoCompleto);
    
    console.log(`🔍 Acción ${accion} en ${rutaNormalizada}: ${puedeEjecutar ? '✅' : '❌'}`);
    return puedeEjecutar;
  }

  // 🏠 PERMISOS ESPECÍFICOS REACTIVOS
  public get permisosFichaCliente() {
    return {
      nuevoCliente: {
        // Métodos reactivos
        puedeVer$: () => this.puedeAccederRuta$('/codbar/ficha-de-cliente/nuevo-cliente'),
        puedeCrear$: () => this.puedeEjecutarAccion$('/codbar/ficha-de-cliente/nuevo-cliente', 'crear'),
        puedeEditar$: () => this.puedeEjecutarAccion$('/codbar/ficha-de-cliente/nuevo-cliente', 'editar'),
        puedeEliminar$: () => this.puedeEjecutarAccion$('/codbar/ficha-de-cliente/nuevo-cliente', 'eliminar'),
        
        // Métodos síncronos (compatibilidad)
        puedeVer: () => this.puedeAccederRuta('/codbar/ficha-de-cliente/nuevo-cliente'),
        puedeCrear: () => this.puedeEjecutarAccion('/codbar/ficha-de-cliente/nuevo-cliente', 'crear'),
        puedeEditar: () => this.puedeEjecutarAccion('/codbar/ficha-de-cliente/nuevo-cliente', 'editar'),
        puedeEliminar: () => this.puedeEjecutarAccion('/codbar/ficha-de-cliente/nuevo-cliente', 'eliminar')
      },
      listadoClientes: {
        puedeVer$: () => this.puedeAccederRuta$('/codbar/ficha-de-cliente/listado-clientes'),
        puedeVer: () => this.puedeAccederRuta('/codbar/ficha-de-cliente/listado-clientes'),
        puedeCrear$: () => this.puedeEjecutarAccion$('/codbar/ficha-de-cliente/listado-clientes', 'crear'),
        puedeCrear: () => this.puedeEjecutarAccion('/codbar/ficha-de-cliente/listado-clientes', 'crear'),
        puedeEditar$: () => this.puedeEjecutarAccion$('/codbar/ficha-de-cliente/listado-clientes', 'editar'),
        puedeEditar: () => this.puedeEjecutarAccion('/codbar/ficha-de-cliente/listado-clientes', 'editar'),
        puedeEliminar$: () => this.puedeEjecutarAccion$('/codbar/ficha-de-cliente/listado-clientes', 'eliminar'),
        puedeEliminar: () => this.puedeEjecutarAccion('/codbar/ficha-de-cliente/listado-clientes', 'eliminar')
      }
      // ... agregar más módulos según necesites
    };
  }

  // 📊 MENÚ REACTIVO
  public get menuPermisos$(): Observable<any> {
    return this.permisos$.pipe(
      map(permisos => ({
        fichaCliente: {
          modulo: permisos.some(p => p.includes('ficha-de-cliente')),
          nuevoCliente: this.verificarAccesoRuta('/codbar/ficha-de-cliente/nuevo-cliente', permisos),
          listadoClientes: this.verificarAccesoRuta('/codbar/ficha-de-cliente/listado-clientes', permisos),
          consultaVerified: this.verificarAccesoRuta('/codbar/ficha-de-cliente/consulta-verified', permisos),
          tipoCliente: this.verificarAccesoRuta('/codbar/ficha-de-cliente/tipo-cliente', permisos),
          grupoCliente: this.verificarAccesoRuta('/codbar/ficha-de-cliente/grupo-cliente', permisos)
        },
        transferencia: {
          modulo: permisos.some(p => p.includes('transferencia')),
          trasPrefijo: this.verificarAccesoRuta('/codbar/transferencia/tras-prefijo', permisos),
          trasGtin: this.verificarAccesoRuta('/codbar/transferencia/tras-gtin', permisos),
          eliminarPrefijo: this.verificarAccesoRuta('/codbar/transferencia/eliminar-prefijo', permisos)
        },
        validacion: {
          modulo: permisos.some(p => p.includes('validacion')),
          validacionSri: this.verificarAccesoRuta('/codbar/validacion/validacionsri', permisos),
          validacionLicenses: this.verificarAccesoRuta('/codbar/validacion/validacion-licenses', permisos),
          validacionProductos: this.verificarAccesoRuta('/codbar/validacion/validacion-productos', permisos)
        },
        reportes: {
          modulo: permisos.some(p => p.includes('reportes')),
          exploradorCliente: this.verificarAccesoRuta('/codbar/reportes/explorador-cliente', permisos),
          gerencia: this.verificarAccesoRuta('/codbar/reportes/gerencia', permisos)
        },
        configuracion: {
          modulo: permisos.some(p => p.includes('configuracion')),
          localizacionEstablecimiento: this.verificarAccesoRuta('/codbar/configuracion/localizacion-establecimiento', permisos),
          grupoProducto: this.verificarAccesoRuta('/codbar/configuracion/grupo-producto', permisos),
          tipoPrefijo: this.verificarAccesoRuta('/codbar/configuracion/tipo-prefijo', permisos)
        }
      })),
      shareReplay(1)
    );
  }

  // 🔧 MÉTODOS AUXILIARES
  private normalizarRuta(ruta: string): string {
    return ruta.replace(/\/:\w+/g, '').replace(/\/\d+/g, '');
  }

  private cargarPermisosDesdeStorage(): void {
    try {
      const stored = localStorage.getItem('userPermissions');
      if (stored) {
        const data = JSON.parse(stored);
        const usuario = this.usuarioService.getUsuarioActual();
        
        // Verificar que los permisos sean del usuario actual
        const esUsuarioActual = usuario && 
          data.usuario_id === usuario.id_usuario && 
          data.empresa_id === usuario.id_empresa;
        
        const esReciente = (new Date().getTime() - data.timestamp) < (24 * 60 * 60 * 1000);
        
        if (esUsuarioActual && esReciente && data.permisos_flat) {
          this.permisosSubject.next([...data.permisos_flat]);
          this.permisosReadySubject.next(true);
          console.log('📦 Permisos cargados desde storage para:', usuario?.nombre_usuario);
        } else {
          console.log('⏰ Permisos en storage obsoletos o de otro usuario');
          localStorage.removeItem('userPermissions');
        }
      }
    } catch (error) {
      console.error('❌ Error cargando desde storage:', error);
      localStorage.removeItem('userPermissions');
    }
  }

  public limpiarPermisos(): void {
    this.permisosSubject.next([]);
    this.permisosReadySubject.next(false);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
    localStorage.removeItem('userPermissions');
    console.log('🧹 Permisos limpiados completamente');
  }

  public getTodosLosPermisos(): string[] {
    return [...this.permisosSubject.value];
  }

  // ⚙️ CONFIGURACIÓN
  public configurarAutoRefresh(intervalMs: number): void {
    this.autoRefreshInterval = intervalMs;
    console.log(`⏱️ Auto-refresh configurado: ${intervalMs}ms`);
  }

  // 📊 ESTADO ACTUAL
  public get estadoActual() {
    return {
      permisos: this.permisosSubject.value,
      listos: this.permisosReadySubject.value,
      cargando: this.loadingSubject.value,
      error: this.errorSubject.value,
      usuario: this.usuarioService.getUsuarioActual()?.nombre_usuario
    };
  }
}