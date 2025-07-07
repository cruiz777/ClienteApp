import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { EmpresaResponse } from 'src/app/interfaces/responses/empresa-response';
import { EmpresaService } from 'src/app/services/empresa.service';
import { LogoService } from 'src/app/services/logo.service';
import { UsuarioService } from 'src/app/services/usuario.service';
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';

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
  constructor(
    private logoService: LogoService,
    private empresaService: EmpresaService,
    private usuarioService: UsuarioService,
    private router: Router
  ) { }

  currentIndex = 0;
  intervalId: any;
  logoUrl: string = '';
  usuario: LoginUsuarioResponse | null = null;
  showPanel = false;

  ngOnInit() {
    this.startCarousel();
    this.usuario = this.usuarioService.getUsuarioActual();

    // Cargar logo inicial desde la base
    this.empresaService.getEmpresas().subscribe({
      next: (empresas: EmpresaResponse[]) => {
        if (empresas.length > 0) {
          const logoFileName = empresas[0].empresaLogo;
          if (logoFileName) {
            const url = this.logoService.getLogoUrl(logoFileName);
            this.logoUrl = url;
            this.logoService.updateLogo(logoFileName); // Notifica a los suscriptores
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar la empresa para el logo:', err);
      }
    });

    // Suscribirse a cambios en el logo (en tiempo real)
    this.logoService.logoUrl$.subscribe((url: string | null) => {
      if (url) {
        this.logoUrl = url;
      }
    });
  }

  startCarousel() {
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
    }, 3000); // cambia cada 3 segundos
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser'); // o como guardes la sesión
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  togglePanel(): void {
    this.showPanel = !this.showPanel;
  }

}
