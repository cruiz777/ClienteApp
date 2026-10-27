import { Component, Input, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from 'src/app/services/usuario.service';
import { LoginUsuarioResponse } from 'src/app/interfaces/responses/usuario-log-response';

@Component({
  selector: 'app-user-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.css']
})
export class UserAvatarComponent implements OnInit {
  @Input() position: 'fixed-top' | 'footer' = 'fixed-top'; // Posición del avatar
  @Input() showUserName: boolean = false; // Mostrar nombre junto al avatar (para footer)
  
  usuario: LoginUsuarioResponse | null = null;
  showPanel = false;

  constructor(
    private usuarioService: UsuarioService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.usuario = this.usuarioService.getUsuarioActual();
  }

  togglePanel(): void {
    this.showPanel = !this.showPanel;
  }

  logout(): void {
    this.showPanel = false; // Cerrar panel antes de logout
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // Cerrar panel al hacer click fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showPanel && !this.elementRef.nativeElement.contains(event.target)) {
      this.showPanel = false;
    }
  }
}