import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T | null;
  message: string;
}

export interface UpdateFechasControlEstadoRequest {
  fecVal: string;
}

export interface UpdateFechasControlEstadoResponse {
  cantidadActualizada: number | null;
}
export interface ApiResponseNumber {
  id: string;
  type: string;
  data: number | null;
  message: string;
}

export interface CierreContableRequest {
  anioCerrar: number;
  fechaCierre: string; // yyyy-MM-dd
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idLocal: number;
  tipDoc: string;
  numDoc?: number | null;
  beneficiario: string;
  observacion?: string | null;
  previewOnly: boolean;
}

export interface CierreContableResponse {
  estado: string;
  idCabMaestro: number;
  anioCerrado: number;
  numDoc: number;
  totalDebe: number;
  totalHaber: number;
  fechaCierre: string;
  diferenciaOriginal: number;
}

export interface ReversarCierreContableRequest {
  anioCerrar: number;
  tipDoc: string;
  numDoc?: number | null;
  idUsuario?: number | null;
  previewOnly: boolean;
}

export interface ReversarCierreContableResponse {
  estado: string;
  idCabMaestroReversado: number;
  anioReversado: number;
  numDoc: number;
  totalLineasEliminadas: number;
  totalDebeEliminado: number;
  totalHaberEliminado: number;
  movimientosAReabrir: number;
}

@Injectable({
  providedIn: 'root'
})
export class CierreContableService {
  // Ajusta esta URL a tu environment si ya lo manejas ahí
  private readonly baseUrl = environment.conciliacionUrl + '/CierreContable';
  private readonly fechasControlUrl = environment.conciliacionUrl + '/CierreContable';
  

  constructor(private http: HttpClient) {}

  previewCierre(payload: Omit<CierreContableRequest, 'previewOnly'>): Observable<ApiResponse<CierreContableResponse>> {
    return this.http.post<ApiResponse<CierreContableResponse>>(
      `${this.baseUrl}/ejecutar`,
      { ...payload, previewOnly: true }
    );
  }

  ejecutarCierre(payload: Omit<CierreContableRequest, 'previewOnly'>): Observable<ApiResponse<CierreContableResponse>> {
    return this.http.post<ApiResponse<CierreContableResponse>>(
      `${this.baseUrl}/ejecutar`,
      { ...payload, previewOnly: false }
    );
  }

  previewReversion(payload: Omit<ReversarCierreContableRequest, 'previewOnly'>): Observable<ApiResponse<ReversarCierreContableResponse>> {
    return this.http.post<ApiResponse<ReversarCierreContableResponse>>(
      `${this.baseUrl}/reversar`,
      { ...payload, previewOnly: true }
    );
  }

  ejecutarReversion(payload: Omit<ReversarCierreContableRequest, 'previewOnly'>): Observable<ApiResponse<ReversarCierreContableResponse>> {
    return this.http.post<ApiResponse<ReversarCierreContableResponse>>(
      `${this.baseUrl}/reversar`,
      { ...payload, previewOnly: false }
    );
  }
  actualizarEstadoFechasControl(
  payload: UpdateFechasControlEstadoRequest
): Observable<ApiResponse<number>> {
  return this.http.put<ApiResponse<number>>(
    `${this.fechasControlUrl}/actualizar-estado`,
    payload
  );
}
}