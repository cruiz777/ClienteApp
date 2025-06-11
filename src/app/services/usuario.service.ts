import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UsuariosResponse } from '../interfaces/responses/usuario-response';
import { UsuariosEditRequest, UsuariosRequest } from '../interfaces/requests/usuario-request';
import { LoginUsuarioResponse } from '../interfaces/responses/usuario-log-response';
import { ApiResponse } from './producto.service';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = `${environment.applicationUrl}/Usuarios`;

  private currentUserSubject = new BehaviorSubject<LoginUsuarioResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) { }

  login(nombreUsuario: string, contrasenia: string): Observable<LoginUsuarioResponse> {
    const body = {
      email: nombreUsuario,
      password: contrasenia
    };

    return this.http.post<{ type: string; data: any; message: string }>(`${this.apiUrl}/login`, body).pipe(
      map(response => {
        console.log('Respuesta cruda del backend:', response);
        if (response.type && response.type.toUpperCase() === "OK" && response.data) {
          const raw = response.data;

          // 🔁 Mapear propiedades snake_case a PascalCase para que coincidan con la interfaz Usuario
          const user: LoginUsuarioResponse = {
            id_usuario: raw.id_usuario,
            nombre_usuario: raw.nombre_usuario,
            nombreD: raw.nombreD,
            id_perfil: raw.id_perfil,
            perfil: raw.perfil,
            id_empresa: raw.id_empresa,
            nombreE: raw.nombreE,
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

  getUsuarioActual(): LoginUsuarioResponse | null {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }

  getUsuarios(): Observable<ApiResponse<UsuariosResponse[]>> {
    return this.http.get<ApiResponse<UsuariosResponse[]>>(this.apiUrl);
  }

  createUsuario(idPerfil: number, request: UsuariosRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/${idPerfil}`, request);
  }

  updateUsuario(idPerfil: number, usuario: UsuariosRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${idPerfil}`, usuario);
  }

  getUsuarioById(idUsuario: number): Observable<ApiResponse<UsuariosResponse>> {
    return this.http.get<ApiResponse<UsuariosResponse>>(`${this.apiUrl}/${idUsuario}`);
  }

  getUsuarioByIdPersona(idPersona: number, idEmpresa: number): Observable<ApiResponse<UsuariosResponse>> {
    return this.http.get<ApiResponse<UsuariosResponse>>(`${this.apiUrl}/persona/${idPersona}/empresa/${idEmpresa}`);
  }

  buscarEntidadPorRuc(idUsuario: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${idUsuario}`);
  }

  buscarEntidadPorNombre(idUsuario: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${idUsuario}`);
  }
}
