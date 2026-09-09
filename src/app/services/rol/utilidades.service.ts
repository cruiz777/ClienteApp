import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { GrabarUtilidadesRequest, UtilidadesRequest } from 'src/app/interfaces/requests/utilidades-request';
import { UtilidadEmpleadoResponse } from 'src/app/interfaces/responses/utilidades-response';

@Injectable({
  providedIn: 'root'
})
export class UtilidadesService {

  private readonly baseUrl = `${environment.nominaEspecialUrl}/Utilidades`;

  constructor(private http: HttpClient) {}

  calcular(request: UtilidadesRequest): Observable<ApiResponse<UtilidadEmpleadoResponse[]>> {
    return this.http.post<ApiResponse<UtilidadEmpleadoResponse[]>>(
      `${this.baseUrl}/calcular`, request
    );
  }

  grabar(request: GrabarUtilidadesRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(
      `${this.baseUrl}/grabar`, request
    );
  }

  recuperar(numPatronal: string, periodo: string, idTipoNomEsp: number): Observable<ApiResponse<UtilidadEmpleadoResponse[]>> {
    return this.http.get<ApiResponse<UtilidadEmpleadoResponse[]>>(
      `${this.baseUrl}/recuperar`, {
        params: { numPatronal, periodo, idTipoNomEsp }
      }
    );
  }
}