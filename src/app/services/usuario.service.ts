import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private currentUserSubject = new BehaviorSubject<{ id: number; usr: string }>({ id: 1, usr: 'admin' });

  // Observable para que otros componentes puedan suscribirse y recibir actualizaciones
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {}

  // Método para actualizar el estado del usuario
  setCurrentUser(user: { id: number; usr: string }): void {
    this.currentUserSubject.next(user);
  }

  // Método para limpiar el estado del usuario (por ejemplo, al cerrar sesión)
  clearCurrentUser(): void {
    this.currentUserSubject.next({ id: 1, usr: 'admin' }); // También podrías restaurar al usuario por defecto si quieres
  }
}
