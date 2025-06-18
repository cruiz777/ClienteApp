import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router } from '@angular/router';
import { UsuarioService } from '../services/usuario.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(private usuarioService: UsuarioService, private router: Router) { }

  canActivate(): Observable<boolean> {
    return this.validateUser();
  }

  canActivateChild(): Observable<boolean> {
    return this.validateUser();
  }

  private validateUser(): Observable<boolean> {
    return this.usuarioService.currentUser$.pipe(
      map(user => {
        if (user) return true;
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
