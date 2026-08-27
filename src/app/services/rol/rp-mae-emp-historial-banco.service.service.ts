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

export interface RpMaeEmpHistorialBancoResponse {
  idHistorialBanco: number;
  idEmpleado: number;

  codcuenta: string | null;

  codban: number | null;
  banco: string | null;

  ctacte: string | null;

  idFormaPago: number | null;
  formaPago: string | null;

  codBanTercero: number | null;
  bancoTercero: string | null;

  idCuentaBanco: number | null;
  tipoCuentaBanco: string | null;

  fechaDesde: string;
  fechaHasta: string | null;
}

export interface CreateRpMaeEmpHistorialBancoRequest {
  idEmpleado: number;
  codcuenta: string | null;
  codban: number | null;
  ctacte: string | null;
  idFormaPago: number | null;
  codBanTercero: number | null;
  idCuentaBanco: number | null;
  fechaDesde: string;
  fechaHasta: string | null;
}

export interface UpdateRpMaeEmpHistorialBancoRequest {
  idHistorialBanco: number;
  codcuenta: string | null;
  codban: number | null;
  ctacte: string | null;
  idFormaPago: number | null;
  codBanTercero: number | null;
  idCuentaBanco: number | null;
  fechaDesde: string;
  fechaHasta: string | null;
}

export interface SyncRpMaeEmpHistorialBancoRequest {
  idEmpleado: number;
  crear: CreateRpMaeEmpHistorialBancoRequest[];
  actualizar: UpdateRpMaeEmpHistorialBancoRequest[];
  eliminar: number[];
}

@Injectable({
  providedIn: 'root'
})
export class RpMaeEmpHistorialBancoService {

  private readonly apiUrl = `${environment.employeesUrl}/RpMaeEmpHistorialBanco`;

  constructor(private http: HttpClient) {}

  getByEmpleado(idEmpleado: number): Observable<ApiResponse<RpMaeEmpHistorialBancoResponse[]>> {
    return this.http.get<ApiResponse<RpMaeEmpHistorialBancoResponse[]>>(
      `${this.apiUrl}/${idEmpleado}`
    );
  }

  create(request: CreateRpMaeEmpHistorialBancoRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      this.apiUrl,
      request
    );
  }

  update(request: UpdateRpMaeEmpHistorialBancoRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      this.apiUrl,
      request
    );
  }

  delete(idHistorialBanco: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/${idHistorialBanco}`
    );
  }

  sync(request: SyncRpMaeEmpHistorialBancoRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/sync`,
      request
    );
  }
}