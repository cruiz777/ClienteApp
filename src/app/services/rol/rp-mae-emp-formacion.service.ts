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

export interface RpMaeEmpFormacionResponse {
  idFormacion: number;
  idEmpleado: number;
  institucion: string | null;
  observacion: string | null;
  titulo: string | null;
  idNivelInstruccion: number | null;
  nivelInstruccion: string | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
}

export interface CreateRpMaeEmpFormacionRequest {
  idEmpleado: number;
  institucion: string | null;
  observacion: string | null;
  titulo: string | null;
  idNivelInstruccion: number | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
}

export interface UpdateRpMaeEmpFormacionRequest extends CreateRpMaeEmpFormacionRequest {
  idFormacion: number;
}

export interface SyncRpMaeEmpFormacionRequest {
  crear: CreateRpMaeEmpFormacionRequest[];
  actualizar: UpdateRpMaeEmpFormacionRequest[];
  eliminar: number[];
}

@Injectable({
  providedIn: 'root'
})
export class RpMaeEmpFormacionService {

  private readonly apiUrl = `${environment.employeesUrl}/RpMaeEmpFormacion`;

  constructor(private http: HttpClient) {}

  getByEmpleado(idEmpleado: number): Observable<ApiResponse<RpMaeEmpFormacionResponse[]>> {
    return this.http.get<ApiResponse<RpMaeEmpFormacionResponse[]>>(
      `${this.apiUrl}/empleado/${idEmpleado}`
    );
  }

  create(request: CreateRpMaeEmpFormacionRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.apiUrl, request);
  }

  update(request: UpdateRpMaeEmpFormacionRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.apiUrl, request);
  }

  delete(idFormacion: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/${idFormacion}`
    );
  }

  sync(request: SyncRpMaeEmpFormacionRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/sync`,
      request
    );
  }
}