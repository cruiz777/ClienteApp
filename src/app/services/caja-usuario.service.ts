// src/app/services/caja-usuario.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
// ====== MODELOS (ajusta si tu backend cambia) ======
export interface ApiResponse<T> {
  id: string;
  type: 'Success' | 'Error' | 'NotFound' | 'Conflict' | string;
  data: T;
  message?: string;
  count?: number;
}

export interface AutorizacionCajaUsuarioDto {
  idAutorizacionUsuario: number;
  idUsuario: number;
  idAutorizacionCaja: number;
  activa: boolean | null;
  caja?: string | null;
  numEstablecimiento?: string | null;
}

// payloads básicos por si usas los demás endpoints
export interface CreateAutorizacionCajaUsuarioRequest {
  idUsuario: number;
  idAutorizacionCaja: number;
  activa?: boolean | null;
}

export interface UpdateAutorizacionCajaUsuarioRequest {
  idAutorizacionUsuario: number;
  activa?: boolean | null;
  idUsuario?: number | null;
  idAutorizacionCaja?: number | null;
}
// ====== NUEVOS MODELOS ======
export interface AutorizacionCajaDto {
  id_autorizacion_caja: number;
  caja: string;
  numero_autorizacion: string;
  docini: number;
  docfin: number;
  fecini: string;  // ISO string del backend
  fecfin: string;  // ISO string del backend
  doc_sri: number;
  numero_factura: string;
  estado_factura: string;
  num_establecimiento: string;
  id_local: number;
  direccion: string;
  ruc: string;
  nombre_comercial: string;
  id_empresa: number;
  generar_xml: boolean;
  id_tipo_documento: number;
  numero_ncredito: string;
  estado_ncredito: string;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CajaUsuarioService {

  // Ponlo en environments si quieres: environment.apiBase
  private readonly baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  /**
   * GET /usuarios/{idUsuario}?soloActivas=true|false
   * Ejemplo de respuesta: ApiResponse<AutorizacionCajaUsuarioDto[]>
   */
  getByUsuario(idUsuario: number, soloActivas?: boolean): Observable<ApiResponse<AutorizacionCajaUsuarioDto[]>> {
    let params = new HttpParams();
    if (soloActivas !== undefined && soloActivas !== null) {
      params = params.set('soloActivas', String(soloActivas));
    }
    return this.http.get<ApiResponse<AutorizacionCajaUsuarioDto[]>>(
      `${this.baseUrl}/AutorizacionCajaUsuario/usuarios/${idUsuario}`,
      { params }
    );
  }

  /** GET /{id} */
  getById(idAutorizacionUsuario: number): Observable<ApiResponse<AutorizacionCajaUsuarioDto>> {
    return this.http.get<ApiResponse<AutorizacionCajaUsuarioDto>>(
      `${this.baseUrl}/AutorizacionCajaUsuario/${idAutorizacionUsuario}`
    );
    }

  /** POST /  */
  create(payload: CreateAutorizacionCajaUsuarioRequest): Observable<ApiResponse<AutorizacionCajaUsuarioDto>> {
    return this.http.post<ApiResponse<AutorizacionCajaUsuarioDto>>(
      `${this.baseUrl}/AutorizacionCajaUsuario`,
      payload
    );
  }

  /** PUT /{id}  */
  update(idAutorizacionUsuario: number, payload: UpdateAutorizacionCajaUsuarioRequest): Observable<ApiResponse<AutorizacionCajaUsuarioDto>> {
    return this.http.put<ApiResponse<AutorizacionCajaUsuarioDto>>(
      `${this.baseUrl}/AutorizacionCajaUsuario/${idAutorizacionUsuario}`,
      payload
    );
  }

  /** DELETE /{id} */
  delete(idAutorizacionUsuario: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.baseUrl}/AutorizacionCajaUsuario/${idAutorizacionUsuario}`
    );
  }
  /** GET /AutorizacionCaja?page=&pageSize=  */
getAutorizacionesCaja(
  page: number = 1,
  pageSize: number = 10
): Observable<ApiResponse<PaginationResponse<AutorizacionCajaDto>>> {
  const params = new HttpParams()
    .set('page', String(page))
    .set('pageSize', String(pageSize));

  return this.http.get<ApiResponse<PaginationResponse<AutorizacionCajaDto>>>(
    `${this.baseUrl}/AutorizacionCaja`,
    { params }
  );
}

}
