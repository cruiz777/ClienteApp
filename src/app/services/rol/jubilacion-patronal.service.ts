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


// ==========================================================
// TIPO SALIDA
// ==========================================================

export type TipoSalidaJubilacion =
  'RENUNCIA'
  |
  'DESPIDO';


// ==========================================================
// REQUEST
// ==========================================================

export interface CalcularJubilacionPatronalRequest {

  idEmpresa: number;

  idEmpleado: number;

  fechaCalculo: string;

  tipoSalida: TipoSalidaJubilacion;
}


// ==========================================================
// DETALLE
// ==========================================================

export interface JubilacionPatronalDetalleResponse {

  anio: number;

  mes: number;


  // ========================================================
  // REMUNERACIÓN TOTAL
  // ========================================================

  remuneracion: number;


  // ========================================================
  // REMUNERACIÓN APORTABLE
  // ========================================================

  remuneracionAportable: number;


  // ========================================================
  // SUELDO APORTADO IESS
  //
  // Lo dejamos opcional porque el backend actual puede
  // todavía no devolverlo.
  // ========================================================

  sueldoAportadoIess?: number | null;


  // ========================================================
  // FONDO DE RESERVA
  // ========================================================

  fondoReserva: number;
}


// ==========================================================
// RESPONSE
// ==========================================================

export interface JubilacionPatronalResponse {

  // ========================================================
  // IDENTIFICACIÓN
  // ========================================================

  idEmpresa: number;

  idEmpleado: number;


  // ========================================================
  // EMPRESA / REPRESENTANTE LEGAL
  // ========================================================

  nombreEmpresa: string;

  representanteLegal: string;

  cargoRepresentanteLegal: string;


  // ========================================================
  // EMPLEADO
  // ========================================================

  cedula: string;

  nombreEmpleado: string;

  cargo: string;


  // ========================================================
  // FECHAS
  // ========================================================

  fechaNacimiento?: string | null;

  fechaIngreso?: string | null;

  fechaSalida?: string | null;

  fechaCalculo?: string | null;


  // ========================================================
  // DATOS LABORALES
  // ========================================================

  sueldoActual: number;

  tipoSalida: string;


  // ========================================================
  // TIEMPO SERVICIO
  // ========================================================

  totalDiasServicio: number;

  aniosServicio: number;

  mesesServicio: number;

  diasServicio: number;


  // ========================================================
  // DERECHO
  // ========================================================

  cumpleJubilacionPatronal: boolean;

  cumpleJubilacionProporcional: boolean;


  // ========================================================
  // ESTADO
  // ========================================================

  calculoDefinitivo: boolean;

  observacion: string;


  // ========================================================
  // TOTALES
  // ========================================================

  totalRemuneraciones: number;

  totalRemuneracionesAportables: number;

  promedioRemuneraciones: number;

  totalFondosReserva: number;


  // ========================================================
  // CÁLCULO FINANCIERO
  // ========================================================

  baseCalculo: number;

  pensionMensual: number;

  fondoGlobal: number;


  // ========================================================
  // DETALLE
  // ========================================================

  detalle: JubilacionPatronalDetalleResponse[];
}


// ==========================================================
// SERVICE
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class JubilacionPatronalService {

  // ========================================================
  // URL
  // ========================================================

  private readonly baseUrl =
    `${environment.nominaEspecialUrl}/JubilacionPatronal`;


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private readonly http: HttpClient
  ) {}


  // ========================================================
  // CALCULAR
  // ========================================================

  calcular(
    request: CalcularJubilacionPatronalRequest
  ): Observable<JubilacionPatronalResponse> {

    return this.http.post<JubilacionPatronalResponse>(
      `${this.baseUrl}/calcular`,
      request
    );
  }
}