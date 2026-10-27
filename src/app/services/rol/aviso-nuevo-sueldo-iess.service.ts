import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';

export interface GenerarAvisoNuevoSueldoIessRequest {
  fechaPeriodo: string;
  idEmpresa: number | null;
  idLocal: number | null;
}

export interface GenerarAvisoNuevoSueldoIessResponse {
  procesado: boolean;
  nombreArchivo: string;
  contenidoBase64: string;
  contentType: string;
  totalEmpleados: number;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class AvisoNuevoSueldoIessService {

  private readonly baseUrl =
    `${environment.nominaUrl}/RolNomina`;

  constructor(
    private readonly http: HttpClient
  ) {}

  generarArchivoIess(
    request: GenerarAvisoNuevoSueldoIessRequest
  ): Observable<ApiResponse<GenerarAvisoNuevoSueldoIessResponse>> {

    return this.http.post<
      ApiResponse<GenerarAvisoNuevoSueldoIessResponse>
    >(
      `${this.baseUrl}/aviso-nuevo-sueldo-iess`,
      request
    );
  }

  generarReporteModificacionSueldos(
    request: GenerarAvisoNuevoSueldoIessRequest
  ): Observable<Blob> {

    return this.http.post(
      `${this.baseUrl}/reporte-modificacion-sueldos`,
      request,
      {
        responseType: 'blob'
      }
    );
  }
}