import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}

export type EstadoEmpleadoReporte = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

export interface ReporteEmpleadosRequest {
  campos: string[];
  estado: EstadoEmpleadoReporte;
  fechaInicio: string | null;
  fechaFin: string | null;
  idZonas: number[];
  idTiposEmpleado: number[];
}

export interface ReporteEmpleadoResponse {
  valores: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ReporteEmpleadosService {
  private readonly baseUrl = `${environment.employeesUrl}/Empleado`;

  constructor(private http: HttpClient) {}

  generarReporte(
    request: ReporteEmpleadosRequest
  ): Observable<ApiResponse<ReporteEmpleadoResponse[]>> {
    return this.http.post<ApiResponse<ReporteEmpleadoResponse[]>>(
      `${this.baseUrl}/reporte`,
      request
    );
  }
}
