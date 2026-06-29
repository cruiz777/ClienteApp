import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  type: string;
  message: string;
  data: T;
}

export interface ValidarCierrePeriodoRequest {
  fecha: string; // yyyy-MM-dd
}

export interface CrearCierrePeriodoRequest {
  fecha: string;      // yyyy-MM-dd
  idUsuario: number;  // ID del usuario que realiza el cierre
  tipo?: string;      // ROL_MENSUAL
}

export interface EliminarCierrePeriodoRequest {
  fecha: string;      // yyyy-MM-dd
  tipo?: string;      // ROL_MENSUAL
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
 * Response esperado para contabilización mensual.
 * Ajusta nombres si tu backend devuelve otros campos.
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
}

@Injectable({
  providedIn: 'root'
})
export class CierrePeriodoService {

  private readonly apiUrl = environment.nominaUrl + '/CierrePeriodo';

  constructor(private http: HttpClient) {}

  validar(request: ValidarCierrePeriodoRequest): Observable<ApiResponse<ValidarCierrePeriodoResponse>> {
    return this.http.post<ApiResponse<ValidarCierrePeriodoResponse>>(
      `${this.apiUrl}/validar`,
      request
    );
  }

  crear(request: CrearCierrePeriodoRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/crear`,
      request
    );
  }

  eliminar(request: EliminarCierrePeriodoRequest): Observable<ApiResponse<boolean>> {
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
}