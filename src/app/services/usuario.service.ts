import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Usuario } from '../interfaces/responses/usuario-response'; // Ajusta si tu ruta es distinta

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = `${environment.securityApiUrl}/Usuarios/login`;

  private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(nombreUsuario: string, contrasenia: string): Observable<Usuario> {
    const body = {
      email: nombreUsuario,
      password: contrasenia
    };

    return this.http.post<{ type: string; data: any; message: string }>(this.apiUrl, body).pipe(
      map(response => {
        console.log('Respuesta cruda del backend:', response);
        if (response.type && response.type.toUpperCase() === "OK" && response.data) {
          const raw = response.data;

          // 🔁 Mapear propiedades snake_case a PascalCase para que coincidan con la interfaz Usuario
          const user: Usuario = {
            IdUsuario: raw.id_usuario,
            NombreUsuario: raw.nombre_usuario,
            IdDepartamento: raw.id_departamento,
            Departamento: raw.departamento,
            IdPerfil: raw.id_perfil,
            Perfil: raw.perfil,
            IdEmpresa: raw.id_empresa,
            Empresa: raw.empresa,
            Estado: raw.estado
          };

          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          return user;
        } else {
          throw new Error(response.message || 'Error al iniciar sesión.');
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('currentUser'); // también limpia el almacenamiento
    this.currentUserSubject.next(null);
  }

  getUsuarioActual(): Usuario | null {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }
}
