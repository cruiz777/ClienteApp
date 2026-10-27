import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';


export type TipoBono =
  'BD' |
  'BH' |
  'BE';


export type RegionBono =
  'S' |
  'C';


export interface ApiResponse<T> {

  id?: string;

  type: string;

  message: string;

  data: T;
}


export interface CalcularBonosRequest {

  idEmpresa: number;

  fechaPeriodo: string;

  tipo: TipoBono;

  region: RegionBono;

  idLocal?: number | null;

  idEmpleado?: number | null;

  forzarRecalculo: boolean;
}


export interface ConsultarBonosRequest {

  idEmpresa: number;

  fechaPeriodo: string;

  tipo: TipoBono;

  region: RegionBono;

  idLocal?: number | null;

  idEmpleado?: number | null;
}


export interface GuardarBonosRequest {

  idEmpresa: number;

  fechaPeriodo: string;

  tipo: TipoBono;

  region: RegionBono;

  idUsuario?: number | null;

  detalles:
    GuardarBonoDetalleRequest[];
}


export interface GuardarBonoDetalleRequest {

  idEmpleado: number;

  idLocal?: number | null;

  numeroDias: number;

  fechaIngreso?: string | null;

  fechaSalida?: string | null;

  valor: number;

  cargas: number;

  descuento: number;

  observacion?: string | null;
}


export interface BonoEmpleadoResponse {

  idEmpresa: number;

  fechaPeriodo: string;

  fechaDesde: string;

  fechaHasta: string;

  tipo: TipoBono;

  region: RegionBono;

  generado: boolean;

  detalles:
    BonoEmpleadoDetalleResponse[];

  totalRegistros?: number;

  totalValor?: number;

  totalDescuento?: number;

  totalLiquido?: number;
}


export interface BonoEmpleadoDetalleResponse {

  idEspecial?: number | null;

  idEmpleado: number;

  idLocal?: number | null;

  local?: string | null;

  numeroAfiliacion?: string | null;

  cedula?: string | null;

  codigoSectorial?: string | null;

  nombreEmpleado: string;

  numeroDias: number;

  valor: number;

  fechaIngreso?: string | null;

  fechaSalida?: string | null;

  cargas: number;

  observacion?: string | null;

  descuento: number;

  liquidoRecibir: number;
}


// ==========================================================
// BANCO
// ==========================================================

export interface BancoBonosRequest {

  idEmpresa: number;

  fechaPeriodo: string;

  tipo: TipoBono;

  region: RegionBono;

  codBanco: number;

  descripcionPago: string;

  idUsuario: number;
}


export interface ArchivoBancoBonosResponse {

  procesado: boolean;

  mensaje?: string | null;

  contenidoBase64?: string | null;

  nombreArchivo?: string | null;

  contentType?: string | null;
}


@Injectable({
  providedIn: 'root'
})
export class BonosService {

  private readonly apiUrl =
    `${environment.nominaEspecialUrl}/bonos`;


  constructor(
    private readonly http: HttpClient
  ) {
  }


  calcular(
    request:
      CalcularBonosRequest
  ): Observable<
    ApiResponse<
      BonoEmpleadoResponse
    >
  > {

    return this.http.post<
      ApiResponse<
        BonoEmpleadoResponse
      >
    >(
      `${this.apiUrl}/calcular`,
      request
    );
  }


  consultar(
    request:
      ConsultarBonosRequest
  ): Observable<
    ApiResponse<
      BonoEmpleadoResponse
    >
  > {

    return this.http.post<
      ApiResponse<
        BonoEmpleadoResponse
      >
    >(
      `${this.apiUrl}/consultar`,
      request
    );
  }


  guardar(
    request:
      GuardarBonosRequest
  ): Observable<
    ApiResponse<boolean>
  > {

    return this.http.post<
      ApiResponse<boolean>
    >(
      `${this.apiUrl}/sync`,
      request
    );
  }


  reporte(
    request:
      ConsultarBonosRequest
  ): Observable<Blob> {

    return this.http.post(
      `${this.apiUrl}/reporte`,
      request,
      {
        responseType:
          'blob'
      }
    );
  }


  generarArchivoBanco(
    request:
      BancoBonosRequest
  ): Observable<
    ApiResponse<
      ArchivoBancoBonosResponse
    >
  > {

    return this.http.post<
      ApiResponse<
        ArchivoBancoBonosResponse
      >
    >(
      `${this.apiUrl}/banco/archivo`,
      request
    );
  }


  imprimirReporteFormaPago(
    request:
      BancoBonosRequest
  ): Observable<Blob> {

    return this.http.post(
      `${this.apiUrl}/banco/reporte`,
      request,
      {
        responseType:
          'blob'
      }
    );
  }
}
