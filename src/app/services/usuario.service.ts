import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UsuariosResponse } from '../interfaces/responses/usuario-response';
import { UsuariosEditRequest, UsuariosRequest } from '../interfaces/requests/usuario-request';
import { LoginUsuarioResponse } from '../interfaces/responses/usuario-log-response';
import { ApiResponse } from './producto.service';
import { RecuperarClaveRequest, UpdateClaveRequest } from '../interfaces/requests/recuperar-clave-request';



@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private apiUrl = `${environment.applicationUrl}/Usuarios`;

  private currentUserSubject = new BehaviorSubject<LoginUsuarioResponse | null>(
    JSON.parse(localStorage.getItem('currentUser') || 'null')
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) { }

login(nombreUsuario: string, contrasenia: string): Observable<LoginUsuarioResponse> {
  const body = {
    email: nombreUsuario,
    password: contrasenia
  };

  return this.http
    .post<{ type: string; data: any; message: string }>(`${this.apiUrl}/login`, body)
    .pipe(
      map(response => {
        console.log('Respuesta cruda del backend:', response);

        if (!response?.type || response.type.toUpperCase() !== 'OK' || !response.data) {
          throw new Error(response?.message || 'Error al iniciar sesión.');
        }

        const raw = response.data;

        // 1) Normalizar "cajas"
        let cajas: any[] = [];
        if (Array.isArray(raw?.cajas)) {
          cajas = raw.cajas;
        } else if (Array.isArray(raw?.autorizacionCajaUsuario)) {
          cajas = raw.autorizacionCajaUsuario;
        } else if (raw?.id_autorizacion_caja) {
          cajas = [{
            id_autorizacion_usuario: raw.id_autorizacion_usuario,
            id_autorizacion_caja: raw.id_autorizacion_caja
          }];
        }

        // 2) Mapear cajas al contrato actual (con id_tipo_documento)
        const cajasMap = cajas
          .map((x: any) => ({
            id_autorizacion_usuario:
              x.id_autorizacion_usuario ??
              x.idAutorizacionUsuario ??
              0,

            id_autorizacion_caja:
              x.id_autorizacion_caja ??
              x.idAutorizacionCaja ??
              0,

            // ✅ NUEVO: viene del backend
            id_tipo_documento:
              x.id_tipo_documento ??
              x.idTipoDocumento ??
              null,

            // opcionales
            caja:
              x.caja ??
              x.Caja ??
              null,

            numero:
              x.numero ??
              x.Numero ??
              null,

            numero_autorizacion:
              x.numero_autorizacion ??
              x.numeroAutorizacion ??
              null
          }))
          .filter((c: any) => !!c.id_autorizacion_caja);

        const user: LoginUsuarioResponse = {
          id_usuario: raw.id_usuario,
          nombre_usuario: raw.nombre_usuario,
          correo: raw.correo ?? null,
          nombreD: raw.nombreD,
          id_perfil: raw.id_perfil,
          perfil: raw.perfil,
          id_empresa: raw.id_empresa,
          nombreE: raw.nombreE,
          estado: raw.estado,
          cajas: cajasMap
        };

        // ✅ Guardar
        localStorage.setItem('currentUser', JSON.stringify(user));

        // ✅ (Recomendado) guardar una caja por defecto: FACTURA (1) primero, si existe
        const cajaDefault =
          user.cajas?.find(c => c.id_tipo_documento === 1) ??
          user.cajas?.[0] ??
          null;

        if (cajaDefault) {
          localStorage.setItem('cajaSeleccionada', JSON.stringify(cajaDefault));
        } else {
          localStorage.removeItem('cajaSeleccionada');
        }

        this.currentUserSubject.next(user);
        return user;
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
  getEmpresaId(): number | null {
    const usuario = this.getUsuarioActual();
    return usuario?.id_empresa ?? null;
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

  enviarCorreoRecuperacion(data: RecuperarClaveRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/recuperar-clave`, data);
  }

  actualizarClave(data: UpdateClaveRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/cambiar-clave`, data);
  }

}
