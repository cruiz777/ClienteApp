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
  tipo?: 'M' | 'Q' | string;
}

export interface CrearCierrePeriodoRequest {
  fecha: string; // yyyy-MM-dd
  idUsuario: number;
  tipo?: 'M' | 'Q' | string;
}

export interface EliminarCierrePeriodoRequest {
  fecha: string; // yyyy-MM-dd
  tipo?: 'M' | 'Q' | string;
}

export interface ValidarCierrePeriodoResponse {
  existe: boolean;
  idCierrePeriodo?: number | null;
  fecha?: string | null;
  periodo?: string | null;
  tipo?: string | null;
}

export interface ContabilizarMensualRequest {
  fechaPeriodo: string; // yyyy-MM-dd
  idUsuario: number;
  idEmpresa: number;
  idZona: number;
  recalcularAntes: boolean;
}

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

export interface CerrarQuincenaRequest {
  fechaPeriodo: string; // yyyy-MM-dd
  numeroQuincena: number;
  idUsuario: number;
  tipo: 'Q' | string;
}

@Injectable({
  providedIn: 'root'
})
export class CierrePeriodoService {
  private readonly cierrePeriodoUrl = environment.nominaUrl + '/CierrePeriodo';
  private readonly rolNominaUrl = environment.nominaUrl + '/RolNomina';

  constructor(private http: HttpClient) {}

  validar(
    request: ValidarCierrePeriodoRequest
  ): Observable<ApiResponse<ValidarCierrePeriodoResponse>> {
    return this.http.post<ApiResponse<ValidarCierrePeriodoResponse>>(
      `${this.cierrePeriodoUrl}/validar`,
      request
    );
  }

  crear(
    request: CrearCierrePeriodoRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.cierrePeriodoUrl}/crear`,
      request
    );
  }

  eliminar(
    request: EliminarCierrePeriodoRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.cierrePeriodoUrl}/eliminar`,
      request
    );
  }

  validarMensual(
    fecha: string
  ): Observable<ApiResponse<ValidarCierrePeriodoResponse>> {
    return this.validar({
      fecha,
      tipo: 'M'
    });
  }

  validarQuincenal(
    fecha: string
  ): Observable<ApiResponse<ValidarCierrePeriodoResponse>> {
    return this.validar({
      fecha,
      tipo: 'Q'
    });
  }

  crearMensual(
    fecha: string,
    idUsuario: number
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.cierrePeriodoUrl}/crear`,
      {
        fecha,
        idUsuario,
        tipo: 'M'
      }
    );
  }

  cerrarQuincena(
    fechaPeriodo: string,
    idUsuario: number,
    numeroQuincena: number = 1
  ): Observable<ApiResponse<boolean>> {
    const request: CerrarQuincenaRequest = {
      fechaPeriodo,
      numeroQuincena,
      idUsuario,
      tipo: 'Q'
    };

    return this.http.post<ApiResponse<boolean>>(
      `${this.rolNominaUrl}/cerrar-quincena`,
      request
    );
  }

  eliminarMensual(
    fecha: string
  ): Observable<ApiResponse<boolean>> {
    return this.eliminar({
      fecha,
      tipo: 'M'
    });
  }

  eliminarQuincenal(
    fecha: string
  ): Observable<ApiResponse<boolean>> {
    return this.eliminar({
      fecha,
      tipo: 'Q'
    });
  }

  contabilizarMensual(
    request: ContabilizarMensualRequest
  ): Observable<ApiResponse<ContabilizarMensualResponse>> {
    return this.http.post<ApiResponse<ContabilizarMensualResponse>>(
      `${this.cierrePeriodoUrl}/contabilizar-mensual`,
      request
    );
  }

  descargarReportePdf(url: string): Observable<Blob> {
    return this.http.get(url, {
      responseType: 'blob'
    });
  }
}