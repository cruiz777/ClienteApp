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

export interface GastoSriEmpleadoResponse {
  idGasSri: number;
  idEmpresa: number;
  idEmpleado: number | null;
  idTipoGasto: number;
  tipoGasto: string | null;
  montoProyectado: number | null;
  montoReal: number | null;
  montoMaximo: string | number | null;
  modificado?: boolean;
}

export interface CreateGastoSriEmpleadoRequest {
  idEmpresa: number;
  idEmpleado: number | null;
  idTipoGasto: number;
  montoProyectado: number | null;
  montoReal: number | null;
}

export interface UpdateGastoSriEmpleadoRequest extends CreateGastoSriEmpleadoRequest {
  idGasSri: number;
}

export interface SyncGastosSriEmpleadoRequest {
  crear: CreateGastoSriEmpleadoRequest[];
  actualizar: UpdateGastoSriEmpleadoRequest[];
  eliminar: number[];
}

@Injectable({
  providedIn: 'root'
})
export class GastosSriEmpleadoService {

  private readonly apiUrl = `${environment.employeesUrl}/GastosSriEmpleado`;

  constructor(private http: HttpClient) {}

  getByEmpleado(idEmpleado: number): Observable<ApiResponse<GastoSriEmpleadoResponse[]>> {
    return this.http.get<ApiResponse<GastoSriEmpleadoResponse[]>>(
      `${this.apiUrl}/empleado/${idEmpleado}`
    );
  }

  sync(request: SyncGastosSriEmpleadoRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/sync`,
      request
    );
  }
}