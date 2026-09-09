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
    private permissionsService: PermissionsService
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    
    this.menuPermisos$ = this.permissionsService.menuPermisos$;
    
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

  

  manejarClick(ruta: string, event: Event): void {
    console.log(`🔍 Verificando acceso a: ${ruta}`);
    
    // Usar el método del service
    if (!this.permissionsService.puedeAccederRuta(ruta)) {
      this.bloquearNavegacion(event, ruta, 'Acceso denegado por permisos');
      return;
    }

    console.log(`✅ Acceso permitido a: ${ruta}`);
  }

  // 🛡️ MÉTODO PARA BLOQUEAR NAVEGACIÓN COMPLETAMENTE
  private bloquearNavegacion(event: Event, ruta: string, razon: string): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.warn(`❌ ${razon} para: ${ruta}`);

    const target = event.target as HTMLElement;
    if (target) {
      target.style.cursor = 'not-allowed';
    }
  }

  puedeAccederRuta(rutaAngular: string): boolean {
    return this.permissionsService.puedeAccederRuta(rutaAngular);
  }

  puedeEjecutarAccion(rutaAngular: string, accion: string): boolean {
    return this.permissionsService.puedeEjecutarAccion(rutaAngular, accion);
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