// navigation-producto.component.ts (versión final)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subject, interval } from 'rxjs';
import { takeUntil, map, shareReplay } from 'rxjs/operators';
import { Cliente } from 'src/app/interfaces/cliente';
import { ClienteSeleccionadoService } from 'src/app/services/cliente-seleccionado.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PermissionsService } from 'src/app/services/permission.service';

@Component({
  selector: 'app-navigation-producto',
  templateUrl: './navigation-producto.component.html',
  styleUrls: ['./navigation-producto.component.css']
})
export class NavigationProductoComponent implements OnInit, OnDestroy {
  
  currentDateTime: string = '';
  isHandset: boolean = false;
  isExpanded: boolean = true;
  clienteSeleccionado: Cliente | null = null;
  usuarioActual: any;
  
  // Destroy subject para cleanup
  private destroy$ = new Subject<void>();

  // 🔒 PERMISOS REACTIVOS BASADOS EN TU JSON REAL
  productosPermisos = {
    // Permisos principales del submenu productos (dentro de ficha-de-cliente.listado-clientes)
    nuevoProducto: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto')),
      shareReplay(1)
    ),
    nuevoGln: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-gln')),
      shareReplay(1)
    ),
    cupones: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.cupones')),
      shareReplay(1)
    ),
    nuevoSscc: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-sscc')),
      shareReplay(1)
    ),
    
    // Sub-acciones del nuevo-producto
    uvIndividual: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-uv')),
      shareReplay(1)
    ),
    ingresarUl: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-ul')),
      shareReplay(1)
    ),
    bloque: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto.bloque')),
      shareReplay(1)
    ),
    reportes: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto.reportes')),
      shareReplay(1)
    ),

    // Sub-acciones de GLN
    informacionGeneralGln: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-gln.informacion-general')),
      shareReplay(1)
    ),
    listadoDeGln: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-gln.listado-de-gln')),
      shareReplay(1)
    ),

    // Sub-acciones de Cupones
    listadoCupones: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.cupones.listado-cupones')),
      shareReplay(1)
    ),
    generarCupones: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.cupones.generar-cupones')),
      shareReplay(1)
    ),

    // Sub-acciones de SSCC
    listadoSscc: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-sscc.listado-sscc')),
      shareReplay(1)
    ),
    generarSscc: this.permissions.permisos$.pipe(
      map(permisos => permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-sscc.generar-sscc')),
      shareReplay(1)
    )
  };

  constructor(
    private clienteSeleccionadoService: ClienteSeleccionadoService,
    private router: Router,
    private usuarioService: UsuarioService,
    private permissions: PermissionsService,
    private breakpointObserver: BreakpointObserver
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    
    // Detectar si es dispositivo móvil
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;
        this.isExpanded = !this.isHandset;
      });
  }

  ngOnInit(): void {
    // Suscribirse al cliente seleccionado
    this.clienteSeleccionadoService.clienteSeleccionado$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cliente => {
        this.clienteSeleccionado = cliente;
        console.log('🏢 Cliente seleccionado en navegación productos:', cliente);
      });

    // Actualizar fecha/hora cada segundo
    this.startDateTimeUpdate();

    // Log de permisos para debug
    this.permissions.permisos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permisos => {
        console.log('🔒 Permisos disponibles en navegación productos:', permisos);
        console.log('🔍 Verificando permisos específicos:', {
          nuevoProducto: permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto'),
          nuevoGln: permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-gln'),
          cupones: permisos.includes('codbar.ficha-de-cliente.listado-clientes.cupones'),
          nuevoSscc: permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-sscc'),
          uvIndividual: permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-uv'),
          ingresarUl: permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto.ingresar-ul'),
          bloque: permisos.includes('codbar.ficha-de-cliente.listado-clientes.nuevo-producto.bloque')
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ MÉTODO PRINCIPAL PARA MANEJAR CLICKS (copiado de tu ejemplo)
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

  // 🔍 MÉTODOS DE VERIFICACIÓN DE PERMISOS
  puedeAccederRuta(rutaAngular: string): boolean {
    return this.permissions.puedeAccederRuta(rutaAngular);
  }

  puedeEjecutarAccion(rutaAngular: string, accion: string): boolean {
    return this.permissions.puedeEjecutarAccion(rutaAngular, accion);
  }

  // 🔄 INICIAR ACTUALIZACIÓN DE FECHA Y HORA
  private startDateTimeUpdate(): void {
    this.updateDateTime();
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateDateTime());
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

  // 🚪 MÉTODO PARA SALIR
  salir(): void {
    this.router.navigate(['/codbar/ficha-de-cliente/listado-clientes']).then(() => {
      // Opcional: recargar la página si es necesario
      // window.location.reload();
    });
  }

  // Verificar si el usuario es administrador
  esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'ADMIN' || this.usuarioActual?.esAdmin;
  }

  // Debug: Mostrar todos los permisos actuales
  mostrarPermisosActuales(): void {
    this.permissions.permisos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permisos => {
        console.table(permisos.filter(p => p.includes('listado-clientes')));
      });
  }
}