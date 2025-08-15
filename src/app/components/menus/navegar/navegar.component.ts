import { Component, OnInit, OnDestroy } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PermissionsService } from 'src/app/services/permission.service'; // 🔒 AGREGAR
import { Observable, Subject } from 'rxjs'; // 🔒 AGREGAR
import { takeUntil } from 'rxjs/operators'; // 🔒 AGREGAR

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
  
  // 🔒 PERMISOS DINÁMICOS
  menuPermisos$: Observable<any>;
  private destroy$ = new Subject<void>();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private usuarioService: UsuarioService,
    private permissions: PermissionsService // 🔒 AGREGAR
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
    
    // 📡 Observar permisos reactivamente
    this.menuPermisos$ = this.permissions.menuPermisos$;
    
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isHandset = result.matches;
        this.isExpanded = !this.isHandset;
      });
  }

  ngOnInit(): void {
    // 🔄 Monitorear cambios de permisos
    this.menuPermisos$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(permisos => {
      console.log('🔄 Permisos del menú actualizados:', permisos);
    });

    // Resto de tu código existente
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  toggleSidebar(): void {
    this.isExpanded = !this.isExpanded;
  }
}