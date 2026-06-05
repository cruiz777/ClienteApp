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

export interface GenerarRolMensualRequest {
  fechaPeriodo: string;
  idLocal: number | null;
  idDepartamento: number | null;
  verLocales: boolean;
  areas: boolean;
  exEmpleados: boolean;
  idUsuario: number | null;
  sobrescribir: boolean;
}
export interface RolMensualRequest {
  fechaPeriodo: string;
  idLocal: number | null;
  idDepartamento: number | null;
  verLocales: boolean;
  areas: boolean;
  exEmpleados: boolean;
  departamentos: boolean;
  totalizados: boolean;
  porRubros: boolean;
  todosLosRubros: boolean;
  totalizar: boolean;
}

export interface RubroColumnaResponse {
  idIngDesc: number;
  codigo: string;
  tipoPago: string;
  descripcion: string;
  columnaKey: string;
}

export interface RolMensualEmpleadoResponse {
  idEmpleado: number;
  codigoEmpleado: string;
  nombreEmpleado: string;
  estado: string;
  idLocal: number | null;
  local: string | null;
  diasTrabajados: number;
  rubros: Record<string, number>;
  totalIngresos: number;
  totalDescuentos: number;
  liquidoRecibir: number;
}

export interface RolMensualTotalesResponse {
  totalRubros: Record<string, number>;
  totalIngresos: number;
  totalDescuentos: number;
  totalLiquidoRecibir: number;
}

export interface RolMensualResponse {
  nodos: any[];
  columnasRubros: RubroColumnaResponse[];
  empleados: RolMensualEmpleadoResponse[];
  totales: RolMensualTotalesResponse;
}
@Injectable({
  providedIn: 'root'
})
export class RolNominaService {
  private readonly apiUrl = `${environment.nominaUrl}/RolNomina`;

  constructor(private http: HttpClient) {}

  generarRolMensual(request: GenerarRolMensualRequest): Observable<ApiResponse<boolean>> {
  return this.http.post<ApiResponse<boolean>>(
    `${this.apiUrl}/generar-mensual`,
    request
  );
}

getRolMensual(request: RolMensualRequest): Observable<ApiResponse<RolMensualResponse>> {
  return this.http.post<ApiResponse<RolMensualResponse>>(
    `${this.apiUrl}/mensual`,
    request
  );
}
}