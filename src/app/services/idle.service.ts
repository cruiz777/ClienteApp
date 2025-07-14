import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { UsuarioService } from './usuario.service';
import { ConfirmDialogComponent } from '../components/reusable/confirm-dialog/confirm-dialog.component';
import { LoginUsuarioResponse } from '../interfaces/responses/usuario-log-response';

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  private timeoutInMs: number = 60 * 60 * 1000; // 60 minutos de inactividad
  private warningInMs: number = 55 * 60 * 1000; // Mostrar advertencia a los 5 minutos
  private warningTimer: any;
  private logoutTimer: any;
  private usuarioActual: LoginUsuarioResponse | null = null;
  private isWatching = false;

  constructor(
    private router: Router,
    private usuarioService: UsuarioService,
    private dialog: MatDialog,
    private ngZone: NgZone
  ) {
    this.usuarioService.currentUser$.subscribe(user => {
      this.usuarioActual = user;
      if (this.usuarioActual && !this.isWatching) {
        this.startWatching(); // <-- ahora sí arranca cuando hay usuario
      }
      if (!this.usuarioActual) {
        this.stopWatching(); // si se desloguea, para los timers
      }
    });
  }

  private startWatching(): void {
    this.isWatching = true;
    this.resetTimers();
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(event =>
      window.addEventListener(event, () => this.resetTimers())
    );
  }

  private stopWatching(): void {
    this.isWatching = false;
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
  }

  private resetTimers(): void {
    if (!this.usuarioActual) return; // Si no está logueado, no hace nada

    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);

    this.warningTimer = setTimeout(() => this.showWarningDialog(), this.warningInMs);
    this.logoutTimer = setTimeout(() => this.logout(), this.timeoutInMs);
  }

  private showWarningDialog(): void {
    if (!this.usuarioActual) return; // Protegemos por si acaso

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message: '¿Sigues ahí? Tu sesión se cerrará pronto.' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        console.log('✅ Usuario activo, reiniciar timers.');
        this.resetTimers();
      } else {
        console.log('❌ Usuario no respondió, cerrando sesión.');
        this.logout();
      }
    });
  }

  private logout(): void {
    console.log('⚡ Cerrando sesión por inactividad.');
    this.usuarioService.logout();
    localStorage.removeItem('authToken');
    this.ngZone.run(() => this.router.navigate(['/login']));
  }
}
