import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, combineLatest, EMPTY, timer, of } from 'rxjs';
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

  // Auto refresco no implementado
  // debido a problemas de rendimiento y maximo de peticiones (no envia peticiones)
  private autoRefreshInterval = 60 * 60 * 1000; // 1 hora de autorefresco
  private maxRetries = 3;

  // 🗺️ MAPEO CORREGIDO - Sin prefijo /codbar/ para coincidir con backend
  private readonly MAPEO_RUTAS: Record<string, string> = {
    //Rutas de inicio
    '/codbar/inicio': 'codbar',
    '/sic-3000/inicio-sic': 'sic-3000',
    '/cg-3000/inicio': 'cg-3000',
    '/rol-3000/inicio': 'rol-3000',
    '/seguridades/inicio': 'seguridades',

    // Ficha de Cliente


    
    '/codbar/ficha-de-cliente/nuevo-cliente': 'codbar.ficha-de-cliente.nuevo-cliente',  // Agregar codbar
    '/codbar/ficha-de-cliente/listado-clientes': 'codbar.ficha-de-cliente.listado-clientes',
    '/codbar/ficha-de-cliente/consulta-verified': 'codbar.ficha-de-cliente.consulta-verified',
    '/codbar/ficha-de-cliente/tipo-cliente': 'codbar.ficha-de-cliente.tipo-cliente',
    '/codbar/ficha-de-cliente/tipo-cliente/crear': 'codbar.ficha-de-cliente.tipo-cliente.nuevo',
    '/codbar/ficha-de-cliente/tipo-cliente/editar': 'codbar.ficha-de-cliente.tipo-cliente.editar',
    '/codbar/ficha-de-cliente/grupo-cliente': 'codbar.ficha-de-cliente.grupo-cliente',
    '/codbar/ficha-de-cliente/grupo-cliente/crear': 'codbar.ficha-de-cliente.grupo-cliente.nuevo',
    '/codbar/ficha-de-cliente/grupo-cliente/editar': 'codbar.ficha-de-cliente.grupo-cliente.editar',

    // ===== PRODUCTOS (dentro de ficha-de-cliente.listado-clientes) =====
    '/productos': 'codbar.ficha-de-cliente.listado-clientes',
    '/productos/nuevo-producto': 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto',
    '/productos/nuevo-gln': 'codbar.ficha-de-cliente.listado-clientes.nuevo-gln',
    '/productos/cupones': 'codbar.ficha-de-cliente.listado-clientes.cupones',
    '/productos/nuevo-sscc': 'codbar.ficha-de-cliente.listado-clientes.nuevo-sscc',

    // Opciones específicas
    '/productos/uv-individual': 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-uv',
    '/productos/ul': 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-ul',
    '/productos/bloque': 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.bloque',

    // Rutas con parámetros (normalizadas)
    '/productos/uv-individual-edit': 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-uv',
    '/productos/uv-individual-edit/:codbar': 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-uv',
    '/productos/ul/:codbar': 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-ul',
    '/productos/ul-edit/:g14': 'codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-ul',


    // Transferencia
    '/codbar/transferencia/tras-prefijo': 'codbar.transferencia.transferencia-de-prefijo',
    '/codbar/transferencia/tras-gtin': 'codbar.transferencia.transferencia-de-gtin',
    '/codbar/transferencia/eliminar-prefijo': 'codbar.transferencia.eliminar-prefijo',

    // Validación
    '/codbar/validacion/validacionsri': 'codbar.validacion.validacion-sri',
    '/codbar/validacion/validacion-licenses': 'codbar.validacion.validacion-licencias-verified',
    '/codbar/validacion/validacion-productos': 'codbar.validacion.validacion-productos-verified',
    '/codbar/validacion/eliminar-productos': 'codbar.validacion.validacion-productos-verified',
    '/codbar/validacion/editar-licenses': 'codbar.validacion.validacion-productos-verified',
     '/codbar/validacion/eliminar-bloque': 'codbar.validacion.validacion-productos-verified',
    // Reportes
    '/codbar/reportes/explorador-cliente': 'codbar.reportes.explorador-clientes',
    '/codbar/reportes/gerencia': 'codbar.reportes.reporte-gerencia-clientes',
    '/codbar/reportes/gerenciate': 'codbar.reportes.reporte-gerencia-empresas',
    '/codbar/reportes/gerenciafactuacion': 'codbar.reportes.reporte-facturacion',
    '/codbar/reportes/datamatrix': 'codbar.validacion.datamatrix',

    // Configuración
    '/codbar/configuracion/localizacion-establecimiento': 'codbar.configuracion.localizacion-establecimiento',
    '/codbar/configuracion/localizacion-establecimiento/crear': 'codbar.configuracion.localizacion-establecimiento.nuevo',
    '/codbar/configuracion/localizacion-establecimiento/editar': 'codbar.configuracion.localizacion-establecimiento.editar',
    '/codbar/configuracion/grupo-producto': 'codbar.configuracion.grupo-producto',
    '/codbar/configuracion/tipo-prefijo': 'codbar.configuracion.tipo-prefijo',

    // Rutas específicas de seguridades
    '/seguridades/usuarios': 'seguridades.usuarios-perfiles.usuarios',
    '/seguridades/usuarios/nuevo': 'seguridades.usuarios-perfiles.usuarios.nuevo',
    '/seguridades/perfiles': 'seguridades.usuarios-perfiles.perfil',
    '/seguridades/perfiles/nuevo-perfil': 'seguridades.usuarios-perfiles.perfil.nuevo-perfil',
    '/seguridades/departamentos': 'seguridades.usuarios-perfiles.departamentos',
    '/seguridades/departamentos/nuevo': 'seguridades.usuarios-perfiles.departamentos.nuevo',
    '/seguridades/entidades': 'seguridades.entidades.entidades',
    '/seguridades/entidades/nuevo': 'seguridades.entidades.entidades.nuevo',
    '/seguridades/empresas': 'seguridades.configuracion.empresas',
    '/seguridades/empresas/grabar': 'seguridades.configuracion.empresas.grabar',
    '/seguridades/zonas': 'seguridades.configuracion.zona',
    '/seguridades/zonas/nuevo': 'seguridades.configuracion.zona.nuevo',
    '/seguridades/proyectos': 'seguridades.configuracion.proyectos',
    '/seguridades/proyectos/nuevo-proyecto': 'seguridades.configuracion.proyectos.nuevo-proyecto',
    '/seguridades/videos': 'seguridades.configuracion.videos',
    '/seguridades/segmento-negocio': 'seguridades.configuracion.segmento-de-negocio',
    '/seguridades/segmento-negocio/locales': 'seguridades.configuracion.segmento-de-negocio.locales',


    // Rutas específicas de SIC-3000
    '/sic-3000/estructura-list': 'sic-3000.inventarios.estructura-comercial',
    '/sic-3000/registroCobros': 'sic-3000.registro-de-cobros',
    '/sic-3000/findividual': 'sic-3000.cuentas-por-cobrar.facturacion.facturacion-individual',
    '/sic-3000/fglobal': 'sic-3000.facturacion.facturacion-global',

  };

  constructor(
    private http: HttpClient,
    private usuarioService: UsuarioService
  ) {
    this.inicializarSistemaReactivo();
  }

  // 🚀 SISTEMA REACTIVO PRINCIPAL
  private inicializarSistemaReactivo(): void {
    console.log('Inicializando sistema reactivo de cambios...');

    // 1. Cargar desde storage al inicio
    this.cargarPermisosDesdeStorage();

    // 2. SOLO recargar cuando cambie el usuario (sin auto-refresh)
    this.usuarioService.currentUser$.pipe(
      distinctUntilChanged((a, b) => a?.id_usuario === b?.id_usuario),
      filter(usuario => !!usuario), // Solo si hay usuario
      // NO usar startWith aquí
      switchMap(usuario => this.cargarPermisosAsync(usuario!)),
      catchError(error => {
        console.error('❌ Error cargando permisos:', error);
        return EMPTY;
      })
    ).subscribe();

    // 3. Force refresh manual (separado, sin combinarlo)
    this.forceRefreshSubject.pipe(
      filter(count => count > 0),
      switchMap(() => {
        const usuario = this.usuarioService.getUsuarioActual();
        return usuario ? this.cargarPermisosAsync(usuario) : EMPTY;
      })
    ).subscribe();
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
    try {
      return this.permisos$.pipe(
        filter(permisos => Array.isArray(permisos)), // Asegurar que es un array
        map(permisos => {
          try {
            return this.verificarAccesoRuta(rutaAngular, permisos);
          } catch (error) {
            console.error('❌ Error verificando acceso:', error);
            return false; // En caso de error, denegar acceso
          }
        }),
        distinctUntilChanged(),
        shareReplay(1),
        catchError(error => {
          console.error('❌ Error en observable de permisos:', error);
          return of(false); // Fallback seguro
        })
      );
    } catch (error) {
      console.error('❌ Error crítico en puedeAccederRuta$:', error);
      return of(false);
    }
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

  // VERIFICACIÓN MEJORADA DE RUTAS
  private verificarAccesoRuta(rutaAngular: string, permisos: string[]): boolean {
    const rutaNormalizada = this.normalizarRuta(rutaAngular);
    console.log(`🔍 Verificando acceso a ruta: ${rutaNormalizada}`);

    const permisoRequerido = this.MAPEO_RUTAS[rutaNormalizada];

    if (!permisoRequerido) {
      console.warn(`⚠️ Sin mapeo para ruta: ${rutaNormalizada}`);
      return false;
    }

    console.log(`🔍 Permiso requerido: ${permisoRequerido}`);
    console.log(`🔍 Permisos disponibles:`, permisos);

    // ✅ VERIFICACIÓN EXACTA SOLAMENTE
    const tienePermiso = permisos.includes(permisoRequerido);

    console.log(`🔍 Resultado para ${rutaNormalizada}: ${tienePermiso ? '✅ PERMITIDO' : '❌ DENEGADO'}`);
    return tienePermiso;
  }

  // 🔧 VERIFICACIÓN CON MÚLTIPLES PATRONES
  private verificarMultiplesPatrones(permisoRequerido: string, permisos: string[]): boolean {
    console.log(`🔍 Verificando permiso requerido: ${permisoRequerido}`);
    console.log(`🔍 Permisos disponibles:`, permisos);

    // 1. Verificar permiso exacto (PRIORIDAD)
    if (permisos.includes(permisoRequerido)) {
      console.log(`✅ Permiso exacto encontrado: ${permisoRequerido}`);
      return true;
    }

    //Solo verificar jerarquía para módulos/sistemas, NO para funcionalidades específicas
    const partesPermiso = permisoRequerido.split('.');

    // Solo permitir jerarquía si es un módulo/sistema (máximo 2 niveles)
    if (partesPermiso.length <= 2) {
      for (let i = partesPermiso.length - 1; i > 0; i--) {
        const permisoParent = partesPermiso.slice(0, i).join('.');

        if (permisos.includes(permisoParent)) {
          console.log(`✅ Permiso padre encontrado para módulo: ${permisoParent}`);
          return true;
        }
      }
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

  public tieneAccionEspecifica(rutaAngular: string, accion: string): boolean {
    const rutaNormalizada = this.normalizarRuta(rutaAngular);
    const permisoBase = this.MAPEO_RUTAS[rutaNormalizada];

    if (!permisoBase) {
      return false;
    }

    const permisoCompleto = `${permisoBase}.${accion}`;
    const permisos = this.permisosSubject.value;

    return permisos.includes(permisoCompleto);
  }

  // 📊 MENÚ REACTIVO MEJORADO
  public get menuPermisos$(): Observable<any> {
    return this.permisos$.pipe(
      map(permisos => {
        console.log('🔄 Calculando permisos de menú con:', permisos);

        return {
          // 📊 CODBAR - Sistema existente
          fichaCliente: {
            modulo: permisos.includes('codbar.ficha-de-cliente') || permisos.includes('codbar'),
            nuevoCliente: permisos.includes('codbar.ficha-de-cliente.nuevo-cliente'),
            listadoClientes: permisos.includes('codbar.ficha-de-cliente.listado-clientes'),
            consultaVerified: permisos.includes('codbar.ficha-de-cliente.consulta-verified'),
            tipoCliente: permisos.includes('codbar.ficha-de-cliente.tipo-cliente'),
            grupoCliente: permisos.includes('codbar.ficha-de-cliente.grupo-cliente'),
            puedeCrearCliente: permisos.includes('codbar.ficha-de-cliente.nuevo-cliente.nuevo'),
            puedeEditarGrupoCliente: permisos.includes('codbar.ficha-de-cliente.grupo-cliente.editar'),
            puedeEditarTipoCliente: permisos.includes('codbar.ficha-de-cliente.tipo-cliente.editar')
          },
          transferencia: {
            modulo: permisos.includes('codbar.transferencia') || permisos.includes('codbar'),
            trasPrefijo: permisos.includes('codbar.transferencia.transferencia-de-prefijo'),
            trasGtin: permisos.includes('codbar.transferencia.transferencia-de-gtin'),
            eliminarPrefijo: permisos.includes('codbar.transferencia.eliminar-prefijo')
          },
          validacion: {
            modulo: permisos.includes('codbar.validacion') || permisos.includes('codbar'),
            validacionSri: permisos.includes('codbar.validacion.validacion-sri'),
            validacionLicenses: permisos.includes('codbar.validacion.validacion-licencias-verified'),
            validacionProductos: permisos.includes('codbar.validacion.validacion-productos-verified')
          },
          reportes: {
            modulo: permisos.includes('codbar.reportes') || permisos.includes('codbar'),
            exploradorCliente: permisos.includes('codbar.reportes.explorador-clientes'),
            gerencia: permisos.includes('codbar.reportes.reporte-gerencia-clientes'),
            gerenciaEmpresas: permisos.includes('codbar.reportes.reporte-gerencia-empresas'),
            reporteFacturacion: permisos.includes('codbar.reportes.reporte-facturacion'),
            datamatrix: permisos.includes('codbar.validacion.datamatrix')
          },
          configuracion: {
            modulo: permisos.includes('codbar.configuracion') || permisos.includes('codbar'),
            localizacionEstablecimiento: permisos.includes('codbar.configuracion.localizacion-establecimiento'),
            grupoProducto: permisos.includes('codbar.configuracion.grupo-producto'),
            tipoPrefijo: permisos.includes('codbar.configuracion.tipo-prefijo')
          },

          // 🔒 SEGURIDADES - Sistema nuevo basado en tus rutas
          seguridades: {
            // Módulo principal
            modulo: permisos.includes('seguridades') ||
                    permisos.some(p => p.startsWith('seguridades.')),

            // Usuarios/Perfiles
            usuariosPerfiles: {
              modulo: permisos.includes('seguridades.usuarios-perfiles'),
              usuarios: permisos.includes('seguridades.usuarios-perfiles.usuarios'),
              perfiles: permisos.includes('seguridades.usuarios-perfiles.perfil'),
              departamentos: permisos.includes('seguridades.usuarios-perfiles.departamentos'),
              // Acciones
              puedeCrearUsuarios: permisos.includes('seguridades.usuarios-perfiles.usuarios.nuevo'),
              puedeCrearPerfiles: permisos.includes('seguridades.usuarios-perfiles.perfil.nuevo-perfil'),
              puedeCrearDepartamentos: permisos.includes('seguridades.usuarios-perfiles.departamentos.nuevo')
            },

            // Entidades
            entidades: {
              modulo: permisos.includes('seguridades.entidades'),
              entidades: permisos.includes('seguridades.entidades.entidades'),
              puedeCrearEntidades: permisos.includes('seguridades.entidades.entidades.nuevo')
            },

            // Configuración
            configuracion: {
              modulo: permisos.includes('seguridades.configuracion'),
              empresas: permisos.includes('seguridades.configuracion.empresas'),
              zonas: permisos.includes('seguridades.configuracion.zona'),
              proyectos: permisos.includes('seguridades.configuracion.proyectos'),
              segmentoNegocio: permisos.includes('seguridades.configuracion.segmento-de-negocio'),
              // Acciones
              puedeGrabarEmpresas: permisos.includes('seguridades.configuracion.empresas.grabar'),
              puedeCrearZonas: permisos.includes('seguridades.configuracion.zona.nuevo'),
              puedeCrearProyectos: permisos.includes('seguridades.configuracion.proyectos.nuevo-proyecto'),
              puedeVerLocales: permisos.includes('seguridades.configuracion.segmento-de-negocio.locales'),
              videos: permisos.includes('seguridades.configuracion.videos')
            },

            // Accesos directos (compatibilidad con código existente)
            usuarios: permisos.includes('seguridades.usuarios-perfiles.usuarios'),
            perfiles: permisos.includes('seguridades.usuarios-perfiles.perfil'),
            departamentos: permisos.includes('seguridades.usuarios-perfiles.departamentos'),
            empresas: permisos.includes('seguridades.configuracion.empresas'),
            zonas: permisos.includes('seguridades.configuracion.zona'),
            proyectos: permisos.includes('seguridades.configuracion.proyectos'),
          },

          // 💰 SIC3000 - Sistema nuevo basado en tus rutas
          sic3000: {
            // Módulo principal
            modulo: permisos.includes('sic3000') ||
                    permisos.includes('sic-3000') ||
                    permisos.some(p => p.startsWith('sic3000.')) ||
                    permisos.some(p => p.startsWith('sic-3000.')),


            estructuraComercial: permisos.includes('sic3000.estructura-comercial') ||
                                permisos.includes('sic-3000.estructura-comercial') ||
                                permisos.includes('sic3000.estructura-list') ||
                                permisos.includes('sic-3000.estructura-list'),

            registroCobros: permisos.includes('sic3000.registro-cobros') ||
                          permisos.includes('sic-3000.registro-cobros') ||
                          permisos.includes('sic3000.registroCobros') ||
                          permisos.includes('sic-3000.registroCobros'),

            // Acciones específicas (expandir según necesidades)
            puedeCrearEstructura: permisos.includes('sic3000.estructura-comercial.crear'),
            puedeEditarCobros: permisos.includes('sic3000.registro-cobros.editar'),
            puedeEliminarRegistros: permisos.includes('sic3000.registro-cobros.eliminar')
          }
        };
      }),
      tap(menuPermisos => {
        console.log('🔍 Permisos de menú calculados:', menuPermisos);
        console.log('📊 CODBAR disponible:', menuPermisos.fichaCliente?.modulo);
        console.log('🔒 SEGURIDADES disponible:', menuPermisos.seguridades?.modulo);
        console.log('💰 SIC3000 disponible:', menuPermisos.sic3000?.modulo);
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
