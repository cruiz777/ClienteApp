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

export interface EmpleadoDiscapacidadResponse {
  idEmpleado: number;
  idTipoDiscapacidad: number | null;
  tipoDiscapacidad: string | null;
  cedulaDis: string | null;
  nombreDis: string | null;
  recidenciaEmp: string | null;
  idPais: number | null;
  pais: string | null;
  convenioEmp: string | null;
  sisSalNetEmp: string | null;
  codCondDiscap: string | null;
  codTipoDiscap: string | null;
  porcentajeDiscap: string | null;
  carnetConadis: string | null;
  descripcionDiscap: string | null;
  ingresosGravOtroEmp: number | null;
  aporteIessOtroEmp: number | null;
  impuestoRetOtroEmp: number | null;
  compEconSalarioDigno: number | null;
}

export interface SyncEmpleadoDiscapacidadRequest {
  idEmpleado: number;
  idTipoDiscapacidad: number | null;
  cedulaDis: string | null;
  nombreDis: string | null;
  recidenciaEmp: string | null;
  idPais: number | null;
  convenioEmp: string | null;
  sisSalNetEmp: string | null;
  codCondDiscap: string | null;
  codTipoDiscap: string | null;
  porcentajeDiscap: string | null;
  carnetConadis: string | null;
  descripcionDiscap: string | null;
  ingresosGravOtroEmp: number | null;
  aporteIessOtroEmp: number | null;
  impuestoRetOtroEmp: number | null;
  compEconSalarioDigno: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class EmpleadoDiscapacidadService {

  private readonly apiUrl = `${environment.employeesUrl}/EmpleadoDiscapacidad`;

  constructor(private http: HttpClient) {}

  getByEmpleado(idEmpleado: number): Observable<ApiResponse<EmpleadoDiscapacidadResponse | null>> {
    return this.http.get<ApiResponse<EmpleadoDiscapacidadResponse | null>>(
      `${this.apiUrl}/empleado/${idEmpleado}`
    );
  }

  sync(request: SyncEmpleadoDiscapacidadRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/sync`,
      request
    );
  }
}