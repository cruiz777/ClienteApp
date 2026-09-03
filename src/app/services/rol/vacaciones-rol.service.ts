import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import {
  CreateSolicitudVacacionesRequest,
  PeriodoVacacionesResponse,
  PreviewSolicitudVacacionesResponse,
  SaldoVacacionesResponse,
  UpdateSolicitudVacacionesRequest,
  VacacionTomadaGridResponse
} from 'src/app/interfaces/responses/vacaciones.response';

@Injectable({
  providedIn: 'root'
})
export class VacacionesService {
  private readonly baseUrl = `${environment.novedadeslUrl}/vacaciones`;

  constructor(private http: HttpClient) {}

  getSaldo(idEmpleado: number): Observable<SaldoVacacionesResponse> {
    return this.http
      .get<ApiResponse<SaldoVacacionesResponse>>(`${this.baseUrl}/saldo/${idEmpleado}`)
      .pipe(map(res => res.data));
  }

  getPeriodos(idEmpleado: number): Observable<PeriodoVacacionesResponse[]> {
    return this.http
      .get<ApiResponse<PeriodoVacacionesResponse[]>>(`${this.baseUrl}/periodos/${idEmpleado}`)
      .pipe(map(res => res.data));
  }

  getPreview(idVacacionTomada: number): Observable<PreviewSolicitudVacacionesResponse> {
    return this.http
      .get<ApiResponse<PreviewSolicitudVacacionesResponse>>(`${this.baseUrl}/${idVacacionTomada}/preview`)
      .pipe(map(res => res.data));
  }

  crearSolicitud(request: CreateSolicitudVacacionesRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.baseUrl, request);
  }

  imprimirPdf(idVacacionTomada: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${idVacacionTomada}/pdf`, { responseType: 'blob' });
  }

  // ===== Explorador: listar / editar / eliminar =====

  getAll(filtros?: { idEmpleado?: number; fechaDesde?: string; fechaHasta?: string }): Observable<VacacionTomadaGridResponse[]> {
    let params = new HttpParams();

    if (filtros?.idEmpleado) {
      params = params.set('idEmpleado', filtros.idEmpleado.toString());
    }
    if (filtros?.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }
    if (filtros?.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }

    return this.http
      .get<ApiResponse<VacacionTomadaGridResponse[]>>(this.baseUrl, { params })
      .pipe(map(res => res.data));
  }

  actualizarSolicitud(request: UpdateSolicitudVacacionesRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.baseUrl, request);
  }

  eliminarSolicitud(idVacacionTomada: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${idVacacionTomada}`);
  }
}