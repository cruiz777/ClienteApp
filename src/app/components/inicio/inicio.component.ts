import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { EmpresaService } from 'src/app/services/empresa.service';
import { LogoService } from 'src/app/services/logo.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { PermissionsService } from 'src/app/services/permission.service';
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';
import { MatDialog } from '@angular/material/dialog';
import { VideosAyudaModalComponent } from '../seguridades/dialogs/videos-ayuda/videos-ayuda-modal.component';

// Interface para definir los sistemas
interface Sistema {
  id: string;
  nombre: string;
  imagenInactiva: string;
  imagenActiva: string;
  ruta: string;
  tienePermiso: boolean;
}

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit, OnDestroy {
  images: string[] = [
    'assets/images/carrusel-inicio-gs1-8.jpg',
    'assets/images/carrusel-inicio-gs1-2.jpg',
    'assets/images/carrusel-inicio-gs1-3.jpg',
    'assets/images/carrusel-inicio-gs1-4.jpg',
    'assets/images/carrusel-inicio-gs1-5.jpg'
  ];

  // Definir los sistemas con sus imágenes y rutas
  sistemas: Sistema[] = [
    {
      id: 'codbar',
      nombre: 'CODBAR GS1',
      imagenInactiva: '/assets/logo/CODBAR-GS1-2.png',
      imagenActiva: '/assets/logo/CODBAR-GS1.png', // Versión a color
      ruta: '/codbar/inicio',
      tienePermiso: false
    },
    {
      id: 'sic-3000',
      nombre: 'SIC 3000',
      imagenInactiva: '/assets/logo/SIC-3000-2.png',
      imagenActiva: '/assets/logo/SIC-3000.png', // Versión a color
      ruta: '/sic-3000/inicio-sic',
      tienePermiso: false
    },
    {
      id: 'cg-3000',
      nombre: 'CG 3000',
      imagenInactiva: '/assets/logo/CG-3000-2.png',
      imagenActiva: '/assets/logo/CG-3000.png', // Versión a color
      ruta: '/cg-3000/inicio-cg',
      tienePermiso: true
    },
    {
      id: 'rol-3000',
      nombre: 'ROL 3000',
      imagenInactiva: '/assets/logo/ROL-3000-2.png',
      imagenActiva: '/assets/logo/ROL-3000.png', // Versión a color
      ruta: '/rol-3000/inicio-rol',
      tienePermiso: true
    },
    {
      id: 'seguridades',
      nombre: 'Seguridad',
      imagenInactiva: '/assets/logo/seguridad-2.png',
      imagenActiva: '/assets/logo/seguridad.png', // Versión a color
      ruta: '/seguridades/inicio',
      tienePermiso: false
    }
  ];

  constructor(
    private logoService: LogoService,
    private empresaService: EmpresaService,
    private usuarioService: UsuarioService,
    private permissionsService: PermissionsService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.usuarioActual = this.usuarioService.getUsuarioActual();
  }

  currentIndex = 0;
  intervalId: any;
  logoUrl: string = '';
  // usuario: LoginUsuarioResponse | null = null;
  // showPanel = false;
  usuarioActual: any;

  ngOnInit() {
    this.startCarousel();

    // Verificar permisos para cada sistema
    this.verificarPermisos();

    // Cargar logo inicial desde la base
    this.empresaService.getEmpresas().subscribe({
      next: (empresas: EmpresaResponse[]) => {
        if (empresas.length > 0) {
          const logoFileName = empresas[0].empresaLogo;
          if (logoFileName) {
            const url = this.logoService.getLogoUrl(logoFileName);
            this.logoUrl = url;
            this.logoService.updateLogo(logoFileName);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar la empresa para el logo:', err);
      }
    });

    this.logoService.logoUrl$.subscribe((url: string | null) => {
      if (url) {
        this.logoUrl = url;
      }
    });
  }

  // Método para verificar permisos del usuario usando PermissionsService
  verificarPermisos() {
    if (!this.usuarioActual) return;

    // Suscribirse a los permisos desde el PermissionsService
    this.permissionsService.permisos$.subscribe(permisos => {
      console.log('🔍 Verificando permisos de sistemas:', permisos);

      this.sistemas.forEach(sistema => {
        switch (sistema.id) {
          case 'codbar':
            sistema.tienePermiso = this.tieneAccesoSistema('codbar', permisos);
            break;
          case 'sic-3000':
            sistema.tienePermiso = this.tieneAccesoSistema('sic-3000', permisos);
            break;
          // case 'cg-3000':
          //   sistema.tienePermiso = this.tieneAccesoSistema('cg-3000', permisos);
          //   break;
          // case 'rol-3000':
          //   sistema.tienePermiso = this.tieneAccesoSistema('rol-3000', permisos);
          //   break;
          case 'seguridades':
            sistema.tienePermiso = this.tieneAccesoSistema('seguridades', permisos);
            break;
        }
      });

      console.log('🔍 Sistemas con permisos actualizados:', this.sistemas);
    });
  }

  // Método helper para verificar acceso a sistemas específicos
  private tieneAccesoSistema(nombreSistema: string, permisos: string[]): boolean {
    // Verificar si el usuario tiene acceso al sistema específico
    // Basado en tu JSON: permisos_flat: ["codbar", "codbar.ficha-de-cliente", ...]
    debugger
    const tieneAcceso = permisos.includes(nombreSistema) ||
                       permisos.some(p => p.startsWith(`${nombreSistema}.`)) ||
                       this.usuarioActual?.perfil === 'ADMIN';

    console.log(`🔍 Sistema ${nombreSistema}: ${tieneAcceso ? '✅ PERMITIDO' : '❌ DENEGADO'}`);
    return tieneAcceso;
  }

  // Método para navegar solo si tiene permisos
  navegarA(sistema: Sistema, event: Event) {
    event.preventDefault();

    if (!sistema.tienePermiso) {
      return; // No hace nada si no tiene permisos
    }

    this.router.navigate([sistema.ruta]);
  }

  // Método para obtener la imagen actual (inactiva por defecto, activa en hover si tiene permisos)
  obtenerImagenSistema(sistema: Sistema): string {
    return sistema.imagenInactiva;
  }

  startCarousel() {
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
    }, 3000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  abrirModalAyuda(): void {
    this.dialog.open(VideosAyudaModalComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '85vh',
      panelClass: 'custom-dialog-container'
    });
  }
}
