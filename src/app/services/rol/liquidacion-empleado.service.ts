import { Injectable } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from 'src/environments/environment';


// ============================================================
// RESPONSE GENERAL
// ============================================================

export interface ApiResponse<T> {

  id?: string;

  type: string;

  message: string;

  data: T | null;
}


// ============================================================
// REQUEST CALCULAR LIQUIDACION
// ============================================================

export interface CalcularLiquidacionRequest {

  idEmpleado: number;

  idLocal?: number | null;

  fechaIngreso: string;

  fechaSalida: string;

  tipoSalida:
    'DESAHUCIO' |
    'DESPIDO_INTEMPESTIVO';

  incluirNomina: boolean;

  vacacionesAnticipadas: boolean;

  /*
   * Se mantiene por compatibilidad con el backend.
   *
   * IMPORTANTE:
   * El backend vuelve a calcular este valor.
   * No debe confiar en el valor enviado por Angular.
   */
  ultimaRemuneracion: number;
}


// ============================================================
// DETALLE LIQUIDACION
// ============================================================

export interface LiquidacionDetalleResponse {

  idIngresoDesc?: number | null;

  codigo?: string | null;

  tipoRubro:
    'I' |
    'D' |
    'P' |
    string;

  descripcion: string;

  cantidad: number;

  valor: number;

  origen: string;
}


// ============================================================
// RESULTADO CALCULO
// ============================================================

export interface LiquidacionCalculoResponse {

  idEmpleado: number;

  idLocal?: number | null;

  fechaIngreso: string;

  fechaSalida: string;

  tipoSalida: string;

  incluirNomina: boolean;

  vacacionesAnticipadas: boolean;

  ultimaRemuneracion: number;

  anios: number;

  meses: number;

  dias: number;

  totalIngresos: number;

  totalEgresos: number;

  liquidoRecibir: number;

  detalles: LiquidacionDetalleResponse[];
}


// ============================================================
// DATOS DEL EMPLEADO
// ============================================================

export interface LiquidacionEmpleadoDatosResponse {

  idEmpleado: number;

  cedula?: string | null;

  nombreCompleto: string;

  idLocal?: number | null;

  local?: string | null;

  fechaIngreso?: string | null;

  ultimaRemuneracion: number;
}


// ============================================================
// VALIDAR NOMINA DEL MES
// ============================================================

export interface ValidarNominaLiquidacionResponse {

  idEmpleado: number;

  fechaSalida: string;

  nominaProcesada: boolean;

  debeIncluirNomina: boolean;

  mensaje: string;
}


// ============================================================
// SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class LiquidacionEmpleadoService {

  private readonly apiUrl =
    `${environment.nominaEspecialUrl}/LiquidacionEmpleado`;


  constructor(
    private http: HttpClient
  ) { }


  // ==========================================================
  // CALCULAR
  // ==========================================================

  calcular(
    request: CalcularLiquidacionRequest
  ): Observable<
    ApiResponse<LiquidacionCalculoResponse>
  > {

    return this.http.post<
      ApiResponse<LiquidacionCalculoResponse>
    >(
      `${this.apiUrl}/calcular`,
      request
    );
  }


  // ==========================================================
  // OBTENER EMPLEADO
  //
  // fechaSalida es obligatoria porque el backend utiliza
  // esa fecha para determinar:
  //
  // - última nómina válida
  // - última remuneración
  // ==========================================================

  obtenerEmpleado(
    idEmpleado: number,
    fechaSalida: string
  ): Observable<
    ApiResponse<LiquidacionEmpleadoDatosResponse>
  > {

    const params =
      new HttpParams()
        .set(
          'fechaSalida',
          fechaSalida
        );


    return this.http.get<
      ApiResponse<LiquidacionEmpleadoDatosResponse>
    >(
      `${this.apiUrl}/empleado/${idEmpleado}`,
      {
        params
      }
    );
  }


  // ==========================================================
  // VALIDAR NOMINA
  // ==========================================================

  validarNominaMes(
    idEmpleado: number,
    fechaSalida: string
  ): Observable<
    ApiResponse<ValidarNominaLiquidacionResponse>
  > {

    const params =
      new HttpParams()

        .set(
          'idEmpleado',
          idEmpleado.toString()
        )

        .set(
          'fechaSalida',
          fechaSalida
        );


    return this.http.get<
      ApiResponse<ValidarNominaLiquidacionResponse>
    >(
      `${this.apiUrl}/validar-nomina`,
      {
        params
      }
    );
  }

}