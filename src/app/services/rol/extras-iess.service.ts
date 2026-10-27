import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from 'src/environments/environment';

import {
  ApiResponse
} from 'src/app/interfaces/responses/api-response';


export interface GenerarExtrasIessRequest {

  fechaPeriodo: string;

  idEmpresa: number | null;

  idLocal: number | null;

}


export interface GenerarArchivoExtrasIessResponse {

  procesado: boolean;

  nombreArchivo: string;

  contenidoBase64: string;

  contentType: string;

  totalEmpleados: number;

  totalValor: number;

  mensaje: string;

}


@Injectable({
  providedIn: 'root'
})
export class ExtrasIessService {

  private readonly baseUrl =
    `${environment.nominaUrl}/RolNomina/extras-iess`;

  constructor(
    private readonly http:
      HttpClient
  ) {}


  /*
   * GENERAR ARCHIVO TXT IESS
   *
   * POST:
   * /RolNomina/extras-iess/archivo
   */
  generarArchivo(
    request:
      GenerarExtrasIessRequest
  ): Observable<
    ApiResponse<
      GenerarArchivoExtrasIessResponse
    >
  > {

    return this.http.post<
      ApiResponse<
        GenerarArchivoExtrasIessResponse
      >
    >(
      `${this.baseUrl}/archivo`,
      request
    );

  }


  /*
   * GENERAR REPORTE DETALLADO
   *
   * POST:
   * /RolNomina/extras-iess/reporte-detallado
   *
   * Devuelve PDF.
   */
  generarReporteDetallado(
    request:
      GenerarExtrasIessRequest
  ): Observable<Blob> {

    return this.http.post(
      `${this.baseUrl}/reporte-detallado`,
      request,
      {
        responseType: 'blob'
      }
    );

  }


  /*
   * GENERAR REPORTE TOTALES
   *
   * POST:
   * /RolNomina/extras-iess/reporte-totales
   *
   * Devuelve PDF.
   */
  generarReporteTotales(
    request:
      GenerarExtrasIessRequest
  ): Observable<Blob> {

    return this.http.post(
      `${this.baseUrl}/reporte-totales`,
      request,
      {
        responseType: 'blob'
      }
    );

  }

}