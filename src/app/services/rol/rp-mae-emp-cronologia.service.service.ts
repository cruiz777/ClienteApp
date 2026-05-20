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

export interface SyncRpMaeEmpCronologiaRequest {
  idEmpleado: number;
  crear: CreateRpMaeEmpCronologiaRequest[];
  actualizar: UpdateRpMaeEmpCronologiaRequest[];
  eliminar: number[];
}
export interface RpMaeEmpCronologiaResponse {
  idCronologia: number;
  idEmpleado: number;
  nroContrato: number;
  idTipoContrato: number | null;
  tipoContrato: string | null;
  fecIngreso: string | null;
  fecSalida: string | null;
  fecTercont: string | null;
  numContrato: number | null;
  horasContrato: number | null;
}

export interface CreateRpMaeEmpCronologiaRequest {
  idEmpleado: number;
  nroContrato: number;
  idTipoContrato: number | null;
  fecIngreso: string | null;
  fecSalida: string | null;
  fecTercont: string | null;
  numContrato: number | null;
  horasContrato: number | null;
}

export interface UpdateRpMaeEmpCronologiaRequest {
  idCronologia: number;
  nroContrato: number;
  idTipoContrato: number | null;
  fecIngreso: string | null;
  fecSalida: string | null;
  fecTercont: string | null;
  numContrato: number | null;
  horasContrato: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class RpMaeEmpCronologiaService {

  sync(request: SyncRpMaeEmpCronologiaRequest): Observable<ApiResponse<boolean>> {
  return this.http.put<ApiResponse<boolean>>(
    `${this.apiUrl}/sync`,
    request
  );
}

  private readonly apiUrl = `${environment.employeesUrl}/RpMaeEmpCronologia`;

  constructor(private http: HttpClient) {}

  getByEmpleado(idEmpleado: number): Observable<ApiResponse<RpMaeEmpCronologiaResponse[]>> {
    return this.http.get<ApiResponse<RpMaeEmpCronologiaResponse[]>>(
      `${this.apiUrl}/${idEmpleado}`
    );
  }

  create(request: CreateRpMaeEmpCronologiaRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      this.apiUrl,
      request
    );
  }

  update(request: UpdateRpMaeEmpCronologiaRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      this.apiUrl,
      request
    );
  }

  delete(idCronologia: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/${idCronologia}`
    );
  }
}