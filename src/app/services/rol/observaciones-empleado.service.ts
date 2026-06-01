import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id?: string;
  type: string;
  data: T;
  message?: string;
  count?: number;
}

export interface ObservacionEmpleadoResponse {
  idObs: number;
  idEmpresa: number;
  idEmpleado: number | null;

  fecha: string | null;
  detalle: string | null;
  unidadTiempo: string | null;
  tiempo: string | null;
  incluirNomina: boolean | null;

  idTipoObservacion: number;
  tipoObservacion: string | null;

  idDoc: number;
  idTipoVacacion: number;
  estado: boolean | null;
}

export interface CreateObservacionEmpleadoRequest {
  idEmpresa: number;
  idEmpleado: number | null;

  fecha: string | null;
  detalle: string | null;
  unidadTiempo: string | null;
  tiempo: string | null;
  incluirNomina: boolean | null;

  idTipoObservacion: number;
  idDoc: number;
  idTipoVacacion: number;
  estado: boolean | null;
}

export interface UpdateObservacionEmpleadoRequest extends CreateObservacionEmpleadoRequest {
  idObs: number;
}

export interface SyncObservacionesEmpleadoRequest {
  crear: CreateObservacionEmpleadoRequest[];
  actualizar: UpdateObservacionEmpleadoRequest[];
  eliminar: number[];
}

@Injectable({
  providedIn: 'root'
})
export class ObservacionesEmpleadoService {

  private readonly apiUrl = `${environment.employeesUrl}/ObservacionesEmpleado`;

  constructor(private http: HttpClient) {}

  getByEmpleado(idEmpleado: number): Observable<ApiResponse<ObservacionEmpleadoResponse[]>> {
    return this.http.get<ApiResponse<ObservacionEmpleadoResponse[]>>(
      `${this.apiUrl}/empleado/${idEmpleado}`
    );
  }

  sync(request: SyncObservacionesEmpleadoRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/sync`,
      request
    );
  }
}