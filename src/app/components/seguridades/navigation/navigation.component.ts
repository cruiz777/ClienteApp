import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PermissionsService } from 'src/app/services/permission.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit, OnDestroy {
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  usuarioActual: any;
  
  // 🔒 OBSERVABLE DE PERMISOS ESPECÍFICO PARA SEGURIDADES
  menuPermisos$: Observable<any>;
  private destroy$ = new Subject<void>();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private usuarioService: UsuarioService,
    private permissions: PermissionsService
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    
    // 📡 Crear observable específico para permisos de Seguridades
    this.menuPermisos$ = this.permissions.permisos$.pipe(
      map(permisos => this.calcularPermisosSeguridades(permisos))
    );
    
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;
        this.isExpanded = !this.isHandset;
      });
  }

  ngOnInit(): void {
    // 🔄 Monitorear cambios de permisos para debug
    this.menuPermisos$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(permisos => {
      console.log('🔄 Permisos de Seguridades actualizados:', permisos);
    });

    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🎯 CALCULAR PERMISOS ESPECÍFICOS PARA SEGURIDADES
  private calcularPermisosSeguridades(permisos: string[]): any {
    console.log('🔍 Calculando permisos de Seguridades con:', permisos);
    
    return {
      // Usuarios/Perfiles
      usuarios: {
        acceso: this.tienePermisoSeguridad('usuarios', permisos),
        crear: this.tienePermisoSeguridad('usuarios.crear', permisos),
        editar: this.tienePermisoSeguridad('usuarios.editar', permisos),
        eliminar: this.tienePermisoSeguridad('usuarios.eliminar', permisos)
      },
      perfiles: {
        acceso: this.tienePermisoSeguridad('perfiles', permisos),
        crear: this.tienePermisoSeguridad('perfiles.crear', permisos),
        editar: this.tienePermisoSeguridad('perfiles.editar', permisos)
      },
      departamentos: {
        acceso: this.tienePermisoSeguridad('departamentos', permisos),
        crear: this.tienePermisoSeguridad('departamentos.crear', permisos),
        editar: this.tienePermisoSeguridad('departamentos.editar', permisos)
      },
      
      // Entidades
      entidades: {
        acceso: this.tienePermisoSeguridad('entidades', permisos),
        crear: this.tienePermisoSeguridad('entidades.crear', permisos),
        editar: this.tienePermisoSeguridad('entidades.editar', permisos)
      },
      
      // Configuración
      configuracion: {
        modulo: this.tienePermisoSeguridad('configuracion', permisos) || 
                this.tienePermisoSeguridad('seguridad', permisos),
        empresas: this.tienePermisoSeguridad('configuracion.empresas', permisos) ||
                  this.tienePermisoSeguridad('empresas', permisos),
        zonas: this.tienePermisoSeguridad('configuracion.zonas', permisos) ||
               this.tienePermisoSeguridad('zonas', permisos),
        segmentoNegocio: this.tienePermisoSeguridad('configuracion.segmento-negocio', permisos) ||
                         this.tienePermisoSeguridad('segmento-negocio', permisos),
        proyectos: this.tienePermisoSeguridad('configuracion.proyectos', permisos) ||
                   this.tienePermisoSeguridad('proyectos', permisos)
      }
    };
  }

  //VERIFICAR PERMISOS ESPECÍFICOS DE SEGURIDADES
  private tienePermisoSeguridad(permiso: string, permisos: string[]): boolean {
    // Variantes posibles del permiso
    const variantes = [
      permiso,                                    // usuarios
      `seguridad.${permiso}`,                     // seguridad.usuarios
      `seguridades.${permiso}`,                   // seguridades.usuarios
      `seguridad.${permiso.replace('-', '_')}`,   // seguridad.segmento_negocio
      `seguridades.${permiso.replace('-', '_')}`  // seguridades.segmento_negocio
    ];

    // También verificar si es ADMIN
    const esAdmin = this.usuarioActual?.perfil === 'ADMIN' || 
                    this.usuarioActual?.perfil === 'ADMINISTRADOR';

    const tieneAcceso = variantes.some(v => permisos.includes(v)) || esAdmin;
    
    console.log(`🔍 Permiso ${permiso}: ${tieneAcceso ? '✅ PERMITIDO' : '❌ DENEGADO'}`);
    return tieneAcceso;
  }

  // ✅ MÉTODO PRINCIPAL PARA MANEJAR CLICKS - VALIDACIÓN DE PERMISOS
  manejarClick(ruta: string, event: Event): void {
    console.log(`🔍 Verificando acceso a: ${ruta}`);
    
    // 🚫 VALIDACIÓN: Usar servicio de permisos
    if (!this.permissions.puedeAccederRuta(ruta)) {
      this.bloquearNavegacion(event, ruta, 'Acceso denegado por permisos');
      return;
    }

    // ✅ ACCESO PERMITIDO
    console.log(`✅ Acceso permitido a: ${ruta}`);
    
    // Permitir que el routerLink maneje la navegación naturalmente
  }

  // 🛡️ MÉTODO PARA BLOQUEAR NAVEGACIÓN COMPLETAMENTE
  private bloquearNavegacion(event: Event, ruta: string, razon: string): void {
    // Detener TODOS los eventos
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Log para debugging
    console.warn(`❌ ${razon} para: ${ruta}`);

    // Asegurar que el cursor regrese a normal
    const target = event.target as HTMLElement;
    if (target) {
      target.style.cursor = 'not-allowed';
    }
  }

  // 🔍 MÉTODOS DE VERIFICACIÓN DE PERMISOS (Para uso en template si es necesario)
  puedeAccederRuta(rutaAngular: string): boolean {
    return this.permissions.puedeAccederRuta(rutaAngular);
  }

  puedeEjecutarAccion(rutaAngular: string, accion: string): boolean {
    return this.permissions.puedeEjecutarAccion(rutaAngular, accion);
  }

  // 🔄 MÉTODO PARA ACTUALIZAR FECHA Y HORA
  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const formattedDate = now.toLocaleDateString('es-EC', options);
    const formattedTime = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.currentDateTime = `${this.capitalizeFirstLetter(formattedDate)}, ${formattedTime}`;
  }

  // 🔤 HELPER PARA CAPITALIZAR PRIMERA LETRA
  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // 📱 TOGGLE PARA SIDEBAR
  toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
  }

  // 🚪 MÉTODO SALIR MEJORADO
  salir(): void {
    console.log('🚪 Saliendo del sistema de Seguridades...');
    
    // Opcional: limpiar permisos específicos de seguridades
    // this.permissions.limpiarPermisos();
    
    // Navegar a inicio y recargar
    this.router.navigate(['/inicio']).then(() => {
      console.log('✅ Navegación a inicio completada');
      window.location.reload(); // Fuerza la recarga de la pantalla inicio
    }).catch(error => {
      console.error('❌ Error navegando a inicio:', error);
      // Fallback: ir directamente
      window.location.href = '/inicio';
    });
  }

  // Verificar si el usuario es administrador
  esAdministrador(): boolean {
    return this.usuarioActual?.perfil === 'ADMIN' || 
           this.usuarioActual?.perfil === 'ADMINISTRADOR' ||
           this.usuarioActual?.esAdmin;
  }

  // Debug: Mostrar todos los permisos actuales
  mostrarPermisosActuales(): void {
    this.menuPermisos$.pipe(takeUntil(this.destroy$)).subscribe(permisos => {
      console.table(permisos);
    });
  }
}