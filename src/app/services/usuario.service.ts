import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Usuario } from '../interfaces/responses/usuario-response'; // Ajusta si tu ruta es distinta



@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  
  private apiUrl = `${environment.applicationUrl}/Usuarios/login`;

  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(nombreUsuario: string, contrasenia: string): Observable<Usuario> {
    const body = {
      email: nombreUsuario,
      password: contrasenia
    };

    return this.http.post<{ type: string; data: Usuario; message: string }>(this.apiUrl, body).pipe(
      map(response => {
        console.log('Respuesta cruda del backend:', response);
        if (response.type && response.type.toUpperCase() === "OK" && response.data) {
          const user: Usuario = response.data;
          localStorage.setItem('currentUser', JSON.stringify(user)); // opcional si quieres guardar sesión
          this.currentUserSubject.next(user);
          return user;
        } else {
          throw new Error(response.message || 'Error al iniciar sesión.');
        }
      })
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
  }
}
