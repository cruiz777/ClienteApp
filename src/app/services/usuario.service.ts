import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UsuariosResponse } from '../interfaces/responses/usuario-response';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { UvIndividualComponent } from '../components/productos/uv-individual/uv-individual.component';
import { IdleService } from './idle.service';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = `${environment.applicationUrl}/Usuarios/login`;

  private currentUserSubject = new BehaviorSubject<UsuariosResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(nombreUsuario: string, contrasenia: string): Observable<UsuariosResponse> {
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
          const user: UsuariosResponse = {
            id_usuario: raw.id_usuario,
            nombre_usuario: raw.nombre_usuario,
            id_departamento: raw.id_departamento,
            nombre_departamento: raw.departamento,
            id_persona: raw.id_perfil,
            nombre_perfil: raw.perfil,
            id_empresa: raw.id_empresa,
            nombre_empresa: raw.empresa,
            estado: raw.estado
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

  getUsuarioActual(): UsuariosResponse | null {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }

  getUsuarios():Observable<ApiResponse<UsuariosResponse[]>>{
    return this.http.get<ApiResponse<UsuariosResponse[]>>(this.apiUrl);
  }
}
