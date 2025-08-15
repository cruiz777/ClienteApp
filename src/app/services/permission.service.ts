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

  // 🗺️ MAPEO CORREGIDO - Sin prefijo /codbar/ para coincidir con backend
  private readonly MAPEO_RUTAS: Record<string, string> = {
    // Ficha de Cliente - SIN /codbar/ inicial
    '/codbar/ficha-de-cliente/nuevo-cliente': 'ficha-de-cliente.nuevo-cliente',
    '/codbar/ficha-de-cliente/listado-clientes': 'ficha-de-cliente.listado-clientes',
    '/codbar/ficha-de-cliente/consulta-verified': 'ficha-de-cliente.consulta-verified',
    '/codbar/ficha-de-cliente/tipo-cliente': 'ficha-de-cliente.tipo-cliente',
    '/codbar/ficha-de-cliente/tipo-cliente/crear': 'ficha-de-cliente.tipo-cliente',
    '/codbar/ficha-de-cliente/tipo-cliente/editar': 'ficha-de-cliente.tipo-cliente',
    '/codbar/ficha-de-cliente/grupo-cliente': 'ficha-de-cliente.grupo-cliente',
    '/codbar/ficha-de-cliente/grupo-cliente/crear': 'ficha-de-cliente.grupo-cliente',
    '/codbar/ficha-de-cliente/grupo-cliente/editar': 'ficha-de-cliente.grupo-cliente',
    
    // Transferencia
    '/codbar/transferencia/tras-prefijo': 'transferencia.tras-prefijo',
    '/codbar/transferencia/tras-gtin': 'transferencia.tras-gtin',
    '/codbar/transferencia/eliminar-prefijo': 'transferencia.eliminar-prefijo',
    
    // Validación
    '/codbar/validacion/validacionsri': 'validacion.validacionsri',
    '/codbar/validacion/validacion-licenses': 'validacion.validacion-licenses',
    '/codbar/validacion/validacion-productos': 'validacion.validacion-productos',
    
    // Reportes
    '/codbar/reportes/explorador-cliente': 'reportes.explorador-cliente',
    '/codbar/reportes/gerencia': 'reportes.gerencia',
    
    // Configuración
    '/codbar/configuracion/localizacion-establecimiento': 'configuracion.localizacion-establecimiento',
    '/codbar/configuracion/localizacion-establecimiento/crear': 'configuracion.localizacion-establecimiento',
    '/codbar/configuracion/localizacion-establecimiento/editar': 'configuracion.localizacion-establecimiento',
    '/codbar/configuracion/grupo-producto': 'configuracion.grupo-producto',
    '/codbar/configuracion/tipo-prefijo': 'configuracion.tipo-prefijo'
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

  // Verificar si tiene permiso específico con acciones
  public puedeEjecutarAccion$(rutaAngular: string, accion: string): Observable<boolean> {
    return this.permisos$.pipe(
      map(permisos => this.verificarAccesoConAccion(rutaAngular, accion, permisos)),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  // 🔒 VERIFICACIÓN SÍNCRONA (compatibilidad)
  public puedeAccederRuta(rutaAngular: string): boolean {
    return this.verificarAccesoRuta(rutaAngular, this.permisosSubject.value);
  }

  public puedeEjecutarAccion(rutaAngular: string, accion: string): boolean {
    return this.verificarAccesoConAccion(rutaAngular, accion, this.permisosSubject.value);
  }

  // 🔧 VERIFICACIÓN MEJORADA DE RUTAS
  private verificarAccesoRuta(rutaAngular: string, permisos: string[]): boolean {
    const rutaNormalizada = this.normalizarRuta(rutaAngular);
    console.log(`🔍 Verificando acceso a ruta: ${rutaNormalizada}`);
    
    // Obtener el permiso mapeado
    const permisoRequerido = this.MAPEO_RUTAS[rutaNormalizada];
    
    if (!permisoRequerido) {
      console.warn(`⚠️ Sin mapeo para ruta: ${rutaNormalizada}`);
      return false;
    }

    console.log(`🔍 Permiso requerido: ${permisoRequerido}`);
    console.log(`🔍 Permisos disponibles:`, permisos);

    // NUEVA LÓGICA: Verificar múltiples patrones
    const tienePermiso = this.verificarMultiplesPatrones(permisoRequerido, permisos);
    
    console.log(`🔍 Resultado para ${rutaNormalizada}: ${tienePermiso ? '✅ PERMITIDO' : '❌ DENEGADO'}`);
    return tienePermiso;
  }

  // 🔧 VERIFICACIÓN CON MÚLTIPLES PATRONES
  private verificarMultiplesPatrones(permisoRequerido: string, permisos: string[]): boolean {
    // 1. Verificar permiso exacto
    if (permisos.includes(permisoRequerido)) {
      console.log(`✅ Permiso exacto encontrado: ${permisoRequerido}`);
      return true;
    }

    // 2. Verificar con prefijo codbar
    const conPrefijo = `codbar.${permisoRequerido}`;
    if (permisos.includes(conPrefijo)) {
      console.log(`✅ Permiso con prefijo encontrado: ${conPrefijo}`);
      return true;
    }

    // 3. Verificar jerarquía hacia arriba (permisos padre)
    const partesPermiso = permisoRequerido.split('.');
    for (let i = partesPermiso.length - 1; i > 0; i--) {
      const permisoParent = partesPermiso.slice(0, i).join('.');
      
      if (permisos.includes(permisoParent)) {
        console.log(`✅ Permiso padre encontrado: ${permisoParent}`);
        return true;
      }
      
      // También con prefijo codbar
      const parentConPrefijo = `codbar.${permisoParent}`;
      if (permisos.includes(parentConPrefijo)) {
        console.log(`✅ Permiso padre con prefijo encontrado: ${parentConPrefijo}`);
        return true;
      }
    }

    // 4. Verificar si tiene permisos hijos que otorgan acceso
    const permisosHijos = permisos.filter(p => 
      p.startsWith(permisoRequerido + '.') || 
      p.startsWith(`codbar.${permisoRequerido}.`)
    );

    if (permisosHijos.length > 0) {
      console.log(`✅ Permisos hijos encontrados:`, permisosHijos);
      return true;
    }

    console.log(`❌ No se encontró acceso para: ${permisoRequerido}`);
    return false;
  }

  private verificarAccesoConAccion(rutaAngular: string, accion: string, permisos: string[]): boolean {
    const rutaNormalizada = this.normalizarRuta(rutaAngular);
    const permisoBase = this.MAPEO_RUTAS[rutaNormalizada];

    if (!permisoBase) {
      console.warn(`⚠️ Sin mapeo para ruta con acción: ${rutaNormalizada}`);
      return false;
    }

    // ✅ SOLO aceptar permisos que incluyan la acción explícita
    const candidatos: string[] = [
      `${permisoBase}.${accion}`,                // ficha-de-cliente.nuevo-cliente.crear
      `codbar.${permisoBase}.${accion}`,         // codbar.ficha-de-cliente.nuevo-cliente.crear
      // (opcional) padres con la misma acción: ficha-de-cliente.crear / codbar.ficha-de-cliente.crear
      ...permisoBase.split('.').map((_, i, arr) => arr.slice(0, i + 1).join('.') + `.${accion}`),
      ...permisoBase.split('.').map((_, i, arr) => `codbar.` + arr.slice(0, i + 1).join('.') + `.${accion}`)
    ];

    const puede = candidatos.some(p => permisos.includes(p));
    console.log(`🔍 Acción ${accion} para ${rutaNormalizada}:`, puede ? '✅' : '❌', ' | candidatos:', candidatos);
    return puede;
  }


  // 📊 MENÚ REACTIVO MEJORADO
  public get menuPermisos$(): Observable<any> {
    return this.permisos$.pipe(
      map(permisos => {
        console.log('🔄 Calculando permisos de menú con:', permisos);
        
        return {
          fichaCliente: {
            modulo: this.verificarMultiplesPatrones('ficha-de-cliente', permisos),
            nuevoCliente: this.verificarAccesoRuta('/codbar/ficha-de-cliente/nuevo-cliente', permisos),
            listadoClientes: this.verificarAccesoRuta('/codbar/ficha-de-cliente/listado-clientes', permisos),
            consultaVerified: this.verificarAccesoRuta('/codbar/ficha-de-cliente/consulta-verified', permisos),
            tipoCliente: this.verificarAccesoRuta('/codbar/ficha-de-cliente/tipo-cliente', permisos),
            grupoCliente: this.verificarAccesoRuta('/codbar/ficha-de-cliente/grupo-cliente', permisos)
          },
          transferencia: {
            modulo: this.verificarMultiplesPatrones('transferencia', permisos),
            trasPrefijo: this.verificarAccesoRuta('/codbar/transferencia/tras-prefijo', permisos),
            trasGtin: this.verificarAccesoRuta('/codbar/transferencia/tras-gtin', permisos),
            eliminarPrefijo: this.verificarAccesoRuta('/codbar/transferencia/eliminar-prefijo', permisos)
          },
          validacion: {
            modulo: this.verificarMultiplesPatrones('validacion', permisos),
            validacionSri: this.verificarAccesoRuta('/codbar/validacion/validacionsri', permisos),
            validacionLicenses: this.verificarAccesoRuta('/codbar/validacion/validacion-licenses', permisos),
            validacionProductos: this.verificarAccesoRuta('/codbar/validacion/validacion-productos', permisos)
          },
          reportes: {
            modulo: this.verificarMultiplesPatrones('reportes', permisos),
            exploradorCliente: this.verificarAccesoRuta('/codbar/reportes/explorador-cliente', permisos),
            gerencia: this.verificarAccesoRuta('/codbar/reportes/gerencia', permisos)
          },
          configuracion: {
            modulo: this.verificarMultiplesPatrones('configuracion', permisos),
            localizacionEstablecimiento: this.verificarAccesoRuta('/codbar/configuracion/localizacion-establecimiento', permisos),
            grupoProducto: this.verificarAccesoRuta('/codbar/configuracion/grupo-producto', permisos),
            tipoPrefijo: this.verificarAccesoRuta('/codbar/configuracion/tipo-prefijo', permisos)
          }
        };
      }),
      tap(menuPermisos => {
        console.log('🔍 Permisos de menú calculados:', menuPermisos);
      }),
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