import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { DecimosRequest, GrabarDecimosRequest } from 'src/app/interfaces/requests/decimos-request';
import { DecimosEmpleadoResponse } from 'src/app/interfaces/responses/decimos-response';
import { PeriodoNominaResponse } from '../../interfaces/responses/periodo-nomina-response';
import { GenerarArchivoPichinchaRequest } from 'src/app/interfaces/requests/generar-archivo-request';


@Injectable({
  providedIn: 'root'
})
export class DecimosService {

  private readonly baseUrl = `${environment.nominaEspecialUrl}/Decimos`;

  constructor(private http: HttpClient) {}

  calcular(request: DecimosRequest): Observable<ApiResponse<DecimosEmpleadoResponse[]>> {
    return this.http.post<ApiResponse<DecimosEmpleadoResponse[]>>(
      `${this.baseUrl}/empleados`, request
    );
  }

  existe(numPatronal: string, periodo: string, idTipoNomEsp: number): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(
      `${this.baseUrl}/existe`, {
        params: { numPatronal, periodo, idTipoNomEsp }
      }
    );
  }

  grabar(request: GrabarDecimosRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.baseUrl}/grabar`, request
    );
  }
  recuperar(numPatronal: string, periodo: string, idTipoNomEsp: number): Observable<ApiResponse<DecimosEmpleadoResponse[]>> {
    return this.http.get<ApiResponse<DecimosEmpleadoResponse[]>>(
      `${this.baseUrl}/recuperar`, {
        params: { numPatronal, periodo, idTipoNomEsp }
      }
    );
  }
  getPeriodos(numPatronal: string): Observable<ApiResponse<PeriodoNominaResponse[]>> {
    return this.http.get<ApiResponse<PeriodoNominaResponse[]>>(
      `${this.baseUrl}/periodos`, {
        params: { numPatronal }
      }
    );
  }
  generarArchivoPichincha(request: GenerarArchivoPichinchaRequest): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/generar-archivo-pichincha`,
      request,
      { responseType: 'blob' }
    );
  }
}