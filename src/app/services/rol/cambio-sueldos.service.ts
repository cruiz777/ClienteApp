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


/* ============================================================
   REQUEST
============================================================ */

export interface CambioSueldosRequest {

  /*
   * 1 = Local
   * 2 = Departamento
   * 3 = Cargo
   */
  tipoFiltro: number;


  /*
   * ID del:
   *
   * Local
   * Departamento
   * Cargo
   */
  idFiltro: number;


  /*
   * 1 = Porcentaje
   * 2 = Por valor
   * 3 = Cambio directo
   */
  tipoActualizacion: number;


  /*
   * Ejemplos:
   *
   * porcentaje:
   * 5
   * -5
   *
   * valor:
   * 50
   * -50
   *
   * cambio:
   * 1200
   */
  valor: number;

}


/* ============================================================
   RESPONSE
============================================================ */

export interface CambioSueldosResponse {

  empleadosActualizados: number;

  mensaje: string;

}


/* ============================================================
   SERVICE
============================================================ */

@Injectable({
  providedIn: 'root'
})
export class CambioSueldosService {

  /*
   * Backend:
   *
   * api/CambioSueldos
   */
  private readonly baseUrl =
    `${environment.employeesUrl}/CambioSueldos`;


  constructor(

    private readonly http:
      HttpClient

  ) {}


  // ============================================================
  // PROCESAR
  //
  // POST
  // api/CambioSueldos/procesar
  // ============================================================

  procesar(
    request:
      CambioSueldosRequest
  ): Observable<CambioSueldosResponse> {

    return this.http.post<
      CambioSueldosResponse
    >(
      `${this.baseUrl}/procesar`,
      request
    );

  }

}