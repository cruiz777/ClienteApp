import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PermissionsService } from 'src/app/services/permission.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
// Opcional: para mostrar mensajes de error
// import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-navegar',
  templateUrl: './navegar.component.html',
  styleUrls: ['./navegar.component.css']
})
export class NavegarComponent implements OnInit, OnDestroy {
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  usuarioActual: any;
  
  // 🔒 OBSERVABLE DE PERMISOS DEL SERVICIO
  menuPermisos$: Observable<any>;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router, // ← AGREGADO: Para navegación manual si es necesario
    private breakpointObserver: BreakpointObserver,
    private usuarioService: UsuarioService,
    private permissions: PermissionsService
    // private snackBar: MatSnackBar // ← Opcional: para mostrar mensajes
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    
    // 📡 Usar el observable del servicio que ya maneja todo
    this.menuPermisos$ = this.permissions.menuPermisos$;
    
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
      console.log('🔄 Permisos del menú actualizados:', permisos);
    });

    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ MÉTODO PRINCIPAL PARA MANEJAR CLICKS - TRIPLE VALIDACIÓN
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

  // 🎯 MÉTODO ALTERNATIVO: NAVEGACIÓN COMPLETAMENTE MANUAL (Si prefieres control total)
  navegarManualmente(ruta: string, tienePermiso: boolean | undefined, event: Event): void {
    // Siempre prevenir navegación automática del routerLink
    event.preventDefault();
    event.stopPropagation();
    
    if (!tienePermiso || !this.permissions.puedeAccederRuta(ruta)) {
      console.warn(`❌ Acceso denegado a: ${ruta}`);
      return;
    }
    
    console.log(`✅ Navegando manualmente a: ${ruta}`);
    this.router.navigate([ruta]);
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

  // Verificar si el usuario es administrador
  esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'ADMIN' || this.usuarioActual?.esAdmin;
  }

  // Debug: Mostrar todos los permisos actuales
  mostrarPermisosActuales(): void {
    this.menuPermisos$.pipe(takeUntil(this.destroy$)).subscribe(permisos => {
      console.table(permisos);
    });
  }
}