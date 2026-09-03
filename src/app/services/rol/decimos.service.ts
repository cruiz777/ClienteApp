import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import {
  DecimosRequest,
  GrabarDecimosRequest
} from 'src/app/interfaces/requests/decimos-request';
import { DecimosEmpleadoResponse } from 'src/app/interfaces/responses/decimos-response';
import { PeriodoNominaResponse } from 'src/app/interfaces/responses/periodo-nomina-response';
import { GenerarArchivoPichinchaRequest } from 'src/app/interfaces/requests/generar-archivo-request';

export interface BancoDecimosRequest {
  numPatronal: string;
  periodo: string;
  codBanco: number;
  descripcionPago: string;
  idTipEmp: number;
  idRegimen: number;
  idTipoNomEsp: number;
  idUsuario: number;
}

export interface ArchivoBancoDecimosResponse {
  procesado: boolean;
  nombreArchivo: string;
  contenidoBase64: string;
  contentType: string;
  mensaje: string;
  totalRegistros?: number;
  totalValor?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DecimosService {
  private readonly baseUrl = `${environment.nominaEspecialUrl}/Decimos`;

  constructor(private http: HttpClient) {}

  calcular(
    request: DecimosRequest
  ): Observable<ApiResponse<DecimosEmpleadoResponse[]>> {
    return this.http.post<ApiResponse<DecimosEmpleadoResponse[]>>(
      `${this.baseUrl}/empleados`,
      request
    );
  }

  existe(
    numPatronal: string,
    periodo: string,
    idTipoNomEsp: number,
    idRegimen?: number | null
  ): Observable<ApiResponse<boolean>> {
    const params: any = {
      numPatronal,
      periodo,
      idTipoNomEsp
    };

    // Solo agregar el param si tiene valor — HttpParams no acepta null/undefined
    if (idRegimen !== null && idRegimen !== undefined) {
      params.idRegimen = idRegimen;
    }

    return this.http.get<ApiResponse<boolean>>(
      `${this.baseUrl}/existe`,
      { params }
    );
  }

  grabar(
    request: GrabarDecimosRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.baseUrl}/grabar`,
      request
    );
  }

  recuperar(
    numPatronal: string,
    periodo: string,
    idTipoNomEsp: number,
    idRegimen?: number | null
  ): Observable<ApiResponse<DecimosEmpleadoResponse[]>> {
    const params: any = {
      numPatronal,
      periodo,
      idTipoNomEsp
    };

    if (idRegimen !== null && idRegimen !== undefined) {
      params.idRegimen = idRegimen;
    }

    return this.http.get<ApiResponse<DecimosEmpleadoResponse[]>>(
      `${this.baseUrl}/recuperar`,
      { params }
    );
  }

  getPeriodos(
    numPatronal: string
  ): Observable<ApiResponse<PeriodoNominaResponse[]>> {
    return this.http.get<ApiResponse<PeriodoNominaResponse[]>>(
      `${this.baseUrl}/periodos`,
      {
        params: { numPatronal }
      }
    );
  }

  generarArchivoPichincha(
    request: GenerarArchivoPichinchaRequest
  ): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/generar-archivo-pichincha`,
      request,
      {
        responseType: 'blob'
      }
    );
  }

  generarArchivoBanco(
    request: BancoDecimosRequest
  ): Observable<ApiResponse<ArchivoBancoDecimosResponse>> {
    return this.http.post<ApiResponse<ArchivoBancoDecimosResponse>>(
      `${this.baseUrl}/generar-archivo-banco`,
      request
    );
  }

  imprimirReporteFormaPago(
    request: BancoDecimosRequest
  ): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/reporte-forma-pago/pdf`,
      request,
      {
        responseType: 'blob'
      }
    );
  }
}