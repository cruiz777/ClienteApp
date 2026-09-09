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
  | 'RENUNCIA'
  | 'DESPIDO';


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

  remuneracion: number;

  remuneracionAportable: number;

  fondoReserva: number;
}


// ==========================================================
// RESPONSE
// ==========================================================

export interface JubilacionPatronalResponse {

  idEmpresa?: number;

  idEmpleado: number;

  cedula: string;

  nombreEmpleado: string;

  cargo: string;

  fechaNacimiento?: string | null;

  fechaIngreso?: string | null;

  fechaSalida?: string | null;

  sueldoActual: number;

  tipoSalida: string;

  totalDiasServicio: number;

  aniosServicio: number;

  mesesServicio: number;

  diasServicio: number;

  cumpleJubilacionPatronal: boolean;

  cumpleJubilacionProporcional: boolean;

  calculoDefinitivo: boolean;

  observacion: string;

  totalRemuneraciones: number;

  totalRemuneracionesAportables: number;

  promedioRemuneraciones: number;

  totalFondosReserva: number;

  baseCalculo: number;

  pensionMensual: number;

  fondoGlobal: number;

  detalle:
    JubilacionPatronalDetalleResponse[];
}


// ==========================================================
// SERVICE
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class JubilacionPatronalService {

  /*
   * IMPORTANTE:
   *
   * Usa aquí la URL de nomina_especial_ms.
   *
   * Si en tu environment ya tienes otra propiedad
   * para nómina especial, cambia únicamente esta línea.
   *
   * Ejemplo:
   *
   * environment.nominaEspecialUrl
   *
   * o la misma que actualmente usa
   * impuesto-renta.service.ts.
   */
  private readonly baseUrl =
    `${environment.nominaEspecialUrl}/JubilacionPatronal`;


  constructor(
    private readonly http:
      HttpClient
  ) {}


  // ========================================================
  // CALCULAR
  // ========================================================

  calcular(
    request:
      CalcularJubilacionPatronalRequest
  ): Observable<
    JubilacionPatronalResponse
  > {

    return this.http.post<
      JubilacionPatronalResponse
    >(
      `${this.baseUrl}/calcular`,
      request
    );
  }
}