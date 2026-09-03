import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CreatePermisoRequest,
  MotivoPermiso,
  PermisoResponse,
  TipoPermiso,
  TipoTiempo,
  UpdateEstadoPermisoRequest
} from 'src/app/interfaces/responses/permiso.response';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class PermisoService {
  private readonly baseUrl = `${environment.novedadeslUrl}/permisos`;

  constructor(private http: HttpClient) {}

  crearPermiso(request: CreatePermisoRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.baseUrl, request);
  }

  getPendientes(): Observable<PermisoResponse[]> {
    return this.http
      .get<ApiResponse<PermisoResponse[]>>(`${this.baseUrl}/pendientes`)
      .pipe(map(res => res.data));
  }

  getMotivos(): Observable<MotivoPermiso[]> {
    return this.http
      .get<ApiResponse<MotivoPermiso[]>>(`${this.baseUrl}/motivos`)
      .pipe(map(res => res.data));
  }

  getTiposPermiso(): Observable<TipoPermiso[]> {
    return this.http
      .get<ApiResponse<TipoPermiso[]>>(`${this.baseUrl}/tipos-permiso`)
      .pipe(map(res => res.data));
  }

  getTiposTiempo(): Observable<TipoTiempo[]> {
    return this.http
      .get<ApiResponse<TipoTiempo[]>>(`${this.baseUrl}/tipos-tiempo`)
      .pipe(map(res => res.data));
  }

  // Aprobar (SI), rechazar (NO) o eliminar (ELI) una solicitud
  updateEstado(request: UpdateEstadoPermisoRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/estado`, request);
  }

  // Imprime / reimprime el PDF de la solicitud (con marca de agua NEGADO si estadoAprobacion === 'NO')
  imprimirPdf(idPermiso: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${idPermiso}/pdf`, { responseType: 'blob' });
  }
}