import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id?: string;
  type: string;
  message: string;
  data: T;
}

export interface ValidarCierrePeriodoRequest {
  fecha: string; // yyyy-MM-dd
}

export interface CrearCierrePeriodoRequest {
  fecha: string;      // yyyy-MM-dd
  idUsuario: number;
  tipo?: string;
}

export interface EliminarCierrePeriodoRequest {
  fecha: string;      // yyyy-MM-dd
  tipo?: string;
}

export interface ValidarCierrePeriodoResponse {
  existe: boolean;
  idCierrePeriodo?: number | null;
  fecha?: string | null;
  periodo?: string | null;
  tipo?: string | null;
}

/**
 * Request para:
 * POST /api/CierrePeriodo/contabilizar-mensual
 */
export interface ContabilizarMensualRequest {
  fechaPeriodo: string;      // yyyy-MM-dd
  idUsuario: number;
  idEmpresa: number;
  idZona: number;
  recalcularAntes: boolean;
}

/**
 * Response de:
 * POST /api/CierrePeriodo/contabilizar-mensual
 */
export interface ContabilizarMensualResponse {
  procesado: boolean;

  numDocNomina?: string | null;
  numDocProvision?: string | null;

  totalDebeNomina?: number;
  totalHaberNomina?: number;
  totalDebeProvision?: number;
  totalHaberProvision?: number;

  mensaje?: string | null;

  idCabMaestroNomina?: number | null;
  idCabMaestroProvision?: number | null;

  reporteProvision?: string | null;
  reporteResumenMensual?: string | null;
  reporteAsientoMensual?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CierrePeriodoService {

  private readonly apiUrl = environment.nominaUrl + '/CierrePeriodo';

  constructor(private http: HttpClient) {}

  validar(
    request: ValidarCierrePeriodoRequest
  ): Observable<ApiResponse<ValidarCierrePeriodoResponse>> {
    return this.http.post<ApiResponse<ValidarCierrePeriodoResponse>>(
      `${this.apiUrl}/validar`,
      request
    );
  }

  crear(
    request: CrearCierrePeriodoRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/crear`,
      request
    );
  }

  eliminar(
    request: EliminarCierrePeriodoRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/eliminar`,
      request
    );
  }

  contabilizarMensual(
    request: ContabilizarMensualRequest
  ): Observable<ApiResponse<ContabilizarMensualResponse>> {
    return this.http.post<ApiResponse<ContabilizarMensualResponse>>(
      `${this.apiUrl}/contabilizar-mensual`,
      request
    );
  }
  descargarReportePdf(url: string): Observable<Blob> {
  return this.http.get(url, {
    responseType: 'blob'
  });
}
}