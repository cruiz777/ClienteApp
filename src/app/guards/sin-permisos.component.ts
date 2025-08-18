// sin-permisos.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionsService } from '../services/permission.service';
import { CommonModule } from '@angular/common';
import { UsuarioService } from '../services/usuario.service';

@Component({
  selector: 'app-sin-permisos',
  template: `
    <div class="sin-permisos-container">
      <div class="sin-permisos-card">
        <div class="icon-container">
          <span class="error-icon">🔒</span>
        </div>
        
        <h1>Acceso Denegado</h1>
        
        <p class="message">
          No tienes permisos para acceder a esta página.
        </p>
        
        <div class="details" *ngIf="detalles">
          <p><strong>Página solicitada:</strong> {{ detalles.rutaAnterior }}</p>
          <p><strong>Motivo:</strong> {{ getMotivoTexto(detalles.motivo) }}</p>
          <p><strong>Hora:</strong> {{ detalles.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</p>
        </div>
        
        <div class="actions">
          <button class="btn btn-primary" (click)="volverInicio()">
            Ir al Inicio
          </button>
          
          <button class="btn btn-secondary" (click)="recargarPermisos()">
            Actualizar Permisos
          </button>
          
          <button class="btn btn-danger" (click)="cerrarSesion()">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sin-permisos-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
      padding: 20px;
    }
    
    .sin-permisos-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 40px;
      text-align: center;
      max-width: 500px;
      width: 100%;
    }
    
    .icon-container {
      margin-bottom: 20px;
    }
    
    .error-icon {
      font-size: 64px;
      color: #f44336;
      display: inline-block;
    }
    
    h1 {
      color: #333;
      margin-bottom: 16px;
      font-size: 24px;
    }
    
    .message {
      color: #666;
      margin-bottom: 24px;
      font-size: 16px;
    }
    
    .details {
      background-color: #f9f9f9;
      border-radius: 4px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    
    .details p {
      margin: 8px 0;
      font-size: 14px;
    }
    
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .actions button {
      min-width: 140px;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s;
    }
    
    .btn-primary {
      background-color: #2196F3;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #1976D2;
    }
    
    .btn-secondary {
      background-color: #757575;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #616161;
    }
    
    .btn-danger {
      background-color: #f44336;
      color: white;
    }
    
    .btn-danger:hover {
      background-color: #d32f2f;
    }
    
    @media (max-width: 600px) {
      .actions {
        flex-direction: column;
      }
      
      .actions button {
        width: 100%;
      }
    }
  `]
})
export class SinPermisosComponent implements OnInit {
  
  detalles: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private permissions: PermissionsService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      if (params['rutaAnterior']) {
        this.detalles = {
          rutaAnterior: params['rutaAnterior'],
          motivo: params['motivo'] || 'sin-permisos',
          timestamp: params['timestamp'] ? new Date(+params['timestamp']) : new Date()
        };
      }
    });
    
    console.log('🚫 Usuario redirigido a página sin permisos:', this.detalles);
  }

  getMotivoTexto(motivo: string): string {
    const motivos: { [key: string]: string } = {
      'sin-permisos-inicial': 'No tiene permisos para esta funcionalidad',
      'permiso-revocado-tiempo-real': 'Sus permisos fueron revocados durante la sesión',
      'permiso-revocado-monitoreo': 'Permiso revocado durante monitoreo automático',
      'error-verificacion': 'Error al verificar permisos',
      'sesion-expirada': 'Su sesión ha expirado'
    };
    
    return motivos[motivo] || 'Acceso no autorizado';
  }

  volverInicio(): void {
    this.router.navigate(['/codbar']);
  }

  recargarPermisos(): void {
    console.log('🔄 Recargando permisos manualmente...');
    this.permissions.forzarRecargaPermisos();
    
    // Esperar un poco y luego intentar volver a la página anterior
    setTimeout(() => {
      if (this.detalles?.rutaAnterior) {
        this.router.navigate([this.detalles.rutaAnterior]);
      } else {
        this.volverInicio();
      }
    }, 2000);
  }

  cerrarSesion(): void {
    // Se deslogea correctamente
    this.usuarioService.logout();
    this.router.navigate(['/login']);
  }
}