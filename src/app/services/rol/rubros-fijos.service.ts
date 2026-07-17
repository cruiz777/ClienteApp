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

export interface RubroFijoRubroResponse {
  idIngDesc: number;
  tipoPago: string;
  codigo: string;
  descripcion: string;
}

export interface RubroFijoEmpleadoResponse {
  secuencial: number;
  idEmpleado: number;
  codigoEmpleado: string;
  nombreEmpleado: string;
  idLocal?: number | null;
  idDepartamento?: number | null;
  idCargo?: number | null;
  valor: number;
  cantiIe: number;
  numCuotas: number;
  cuotasPagadas: number;
  observacion?: string | null;
  observacionInterna?: string | null;
}

export interface CargarRubrosFijosRequest {
  idLocales: number[];
  idIngDesc: number;
}

export interface CargarRubrosFijosResponse {
  rubro: RubroFijoRubroResponse;
  empleados: RubroFijoEmpleadoResponse[];
  totalValor: number;
  totalCobrado: number;
  totalPendiente: number;
}

export interface GuardarRubrosFijosRequest {
  idIngDesc: number;
  reemplazarRubro: boolean;
  idUsuario?: number | null;
  empleados: GuardarRubroFijoEmpleadoRequest[];
}

export interface GuardarRubroFijoEmpleadoRequest {
  idEmpleado: number;
  idLocal?: number | null;
  valor: number;
  cantiIe: number;
  numCuotas: number;
  cuotasPagadas: number;
  observacion?: string | null;
  observacionInterna?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RubrosFijosService {
  private readonly apiUrl = environment.nominaUrl + '/RubrosFijos';

  constructor(private readonly http: HttpClient) {}

  getRubros(): Observable<ApiResponse<RubroFijoRubroResponse[]>> {
    return this.http.get<ApiResponse<RubroFijoRubroResponse[]>>(
      `${this.apiUrl}/rubros`
    );
  }

  cargar(
    request: CargarRubrosFijosRequest
  ): Observable<ApiResponse<CargarRubrosFijosResponse>> {
    return this.http.post<ApiResponse<CargarRubrosFijosResponse>>(
      `${this.apiUrl}/cargar`,
      request
    );
  }

  guardar(
    request: GuardarRubrosFijosRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/guardar`,
      request
    );
  }
}