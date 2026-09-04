import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


// ============================================================
// API RESPONSE
// ============================================================

export interface ApiResponse<T> {
  type: string;
  message: string;
  data: T;
}


// ============================================================
// REQUEST CALCULAR
// ============================================================

export interface CalcularImpuestoRentaRequest {
  fechaPeriodo: string;
  idEmpresa: number;
  idLocal?: number | null;
  idEmpleado?: number | null;
}


// ============================================================
// RESPONSE CALCULAR
// ============================================================

export interface ImpuestoRentaResponse {

  idEmpleado: number;

  idLocal: number | null;

  local: string;

  numeroAfiliacion: string;

  cedula: string;

  codigoSectorial: string;

  empleado: string;

  diasTrabajados: number;

  baseImponible: number;

  impuestoRentaAnual: number;

  rebaja: number;

  impuestoCausado: number;

  impuestoPagado: number;

  diferencia: number;

  fechaIngreso: string | null;

  fechaSalida: string | null;

  cargas: number;

  gastosPersonales: number;
}


// ============================================================
// DETALLE PARA GRABAR
// ============================================================

export interface GrabarImpuestoRentaDetalleRequest {

  idEmpleado: number;

  idLocal?: number | null;

  cedula?: string | null;

  numeroAfiliacion?: string | null;

  codigoSectorial?: string | null;

  diasTrabajados: number;

  fechaIngreso?: string | null;

  fechaSalida?: string | null;

  baseImponible: number;

  impuestoRentaAnual: number;

  rebaja: number;

  impuestoCausado: number;

  impuestoPagado: number;

  diferencia: number;

  cargas: number;

  gastosPersonales: number;
}


// ============================================================
// REQUEST GRABAR
// ============================================================

export interface GrabarImpuestoRentaRequest {

  fechaPeriodo: string;

  idEmpresa: number;

  idUsuario: number;

  empleados: GrabarImpuestoRentaDetalleRequest[];
}


// ============================================================
// SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class ImpuestoRentaService {

  private readonly baseUrl =
    `${environment.nominaEspecialUrl}/ImpuestoRenta`;

  constructor(
    private readonly http: HttpClient
  ) {}


  // ==========================================================
  // CALCULAR
  // ==========================================================

  calcular(
    request: CalcularImpuestoRentaRequest
  ): Observable<ApiResponse<ImpuestoRentaResponse[]>> {

    return this.http.post<
      ApiResponse<ImpuestoRentaResponse[]>
    >(
      `${this.baseUrl}/calcular`,
      request
    );
  }


  // ==========================================================
  // GRABAR
  // ==========================================================

  grabar(
    request: GrabarImpuestoRentaRequest
  ): Observable<ApiResponse<boolean>> {

    return this.http.post<
      ApiResponse<boolean>
    >(
      `${this.baseUrl}/grabar`,
      request
    );
  }
}