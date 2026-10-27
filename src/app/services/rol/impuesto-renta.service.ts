import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from 'src/environments/environment';

export interface ApiResponse<T> {
  type: string;
  message: string;
  data: T;
}

export interface GenerarRdepRequest {
  anio: number;
  idEmpresa: number;
  idEmpleado?: number | null;
}

export interface CalcularImpuestoRentaRequest {
  fechaDesde: string;
  fechaHasta: string;
  idEmpresa: number;
  idLocal?: number | null;
  idEmpleado?: number | null;
  forzarRecalculo?: boolean;
}

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

export interface GrabarImpuestoRentaRequest {
  fechaPeriodo: string;
  idEmpresa: number;
  idUsuario: number;
  empleados: GrabarImpuestoRentaDetalleRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class ImpuestoRentaService {

  private readonly baseUrl =
    `${environment.nominaEspecialUrl}/ImpuestoRenta`;

  constructor(
    private readonly http: HttpClient
  ) {}

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

  generarRdepXml(
    request: GenerarRdepRequest
  ): Observable<Blob> {

    return this.http.post(
      `${this.baseUrl}/rdep/xml`,
      request,
      {
        responseType: 'blob'
      }
    );
  }
}
