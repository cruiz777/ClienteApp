import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface ReportesContablesMensualesResponse {
  reporteProvision: string | null;
  reporteResumenMensual: string | null;
  reporteAsientoMensual: string | null;
}

/*
 * Se conserva para no romper imports anteriores.
 * El flujo nuevo usa ReportesContablesMensualesResponse.
 */
export interface ReportesContablesGeneradosResponse
  extends ReportesContablesMensualesResponse {
  fechaPeriodo?: string;
  tieneReportes?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CierrePeriodoService {
  private readonly cierrePeriodoUrl =
    environment.nominaUrl + '/CierrePeriodo';

  private readonly rolNominaUrl =
    environment.nominaUrl + '/RolNomina';

  constructor(
    private readonly http: HttpClient
  ) {}

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

  // ===========================================================
  // NUEVO:
  // GENERAR LOS 3 PDF SIN CREAR NI BUSCAR ASIENTOS CONTABLES
  // ===========================================================

  generarReportes(
    request: ContabilizarMensualRequest
  ): Observable<ApiResponse<ReportesContablesMensualesResponse>> {
    return this.http.post<ApiResponse<ReportesContablesMensualesResponse>>(
      `${this.cierrePeriodoUrl}/generar-reportes`,
      request
    );
  }

  /*
   * Se conserva temporalmente si todavía existe el endpoint viejo.
   * La pantalla ImpresionContabilidad YA NO utiliza este método.
   */
  obtenerReportesGenerados(
    fechaPeriodo: string
  ): Observable<ApiResponse<ReportesContablesGeneradosResponse>> {
    const params =
      new HttpParams()
        .set(
          'fechaPeriodo',
          fechaPeriodo
        );

    return this.http.get<ApiResponse<ReportesContablesGeneradosResponse>>(
      `${this.cierrePeriodoUrl}/reportes-generados`,
      {
        params
      }
    );
  }

  descargarReportePdf(
    url: string
  ): Observable<Blob> {
    return this.http.get(
      url,
      {
        responseType: 'blob'
      }
    );
  }
}
