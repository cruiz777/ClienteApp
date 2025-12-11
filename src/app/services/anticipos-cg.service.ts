// src/app/services/anticipos-cg.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
//Interfaces propias de anticipos CG
import { CreateAnticipoRequest } from '../interfaces/requests/anticipo-cg-request';
import { AnticipoCgResponse } from '../interfaces/responses/anticipo-cg-response';

//Listado (usa mismo tipo que asientos contables)
import { ListadoAsientoContableResponse } from '../interfaces/responses/asientos-contables-response';

/** ===== Respuesta estándar del API ===== */
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}


@Injectable({
  providedIn: 'root',
})
export class AnticiposCgService {
  /**
   * Ajusta esta URL según tu environment.
   * Si tienes algo como `environment.transaccionesCgUrl`, úsalo aquí.
   */
  // private readonly baseUrl = `${environment.transaccionesCgUrl}/Anticipos`;
  private readonly baseUrl = `${environment.transactionUrl}/Anticipos`;
  // o, si usas proxy:
  // private readonly baseUrl = '/api/Anticipos';

  constructor(private http: HttpClient) {}

  // ==========================================================
  //  1) CREAR ANTICIPO  (POST /api/Anticipos)
  // ==========================================================

  /**
   * Crea un anticipo (cabecera + detalles).
   * En el formulario manejas Date; aquí convertimos:
   *  - fechatransaccion → 'YYYYMMDD'
   *  - fechaingreso     → 'YYYY-MM-DDTHH:mm:ss'
   */
  crearAnticipo(request: CreateAnticipoRequest): Observable<ApiResponse<number>> {
    const payload = this.mapCreateRequestToApi(request);
    return this.http.post<ApiResponse<number>>(this.baseUrl, payload);
  }

  /**
   * Mapea CreateAnticipoRequest (con Date) al payload que espera el backend (strings).
   */
  private mapCreateRequestToApi(req: CreateAnticipoRequest): any {
    return {
      ...req,
      // CABECERA
      fechatransaccion: this.formatYYYYMMDD(req.fechatransaccion),
      fechaingreso: this.formatISODateTime(req.fechaingreso),

      // DETALLES
      detalles: req.detalles.map(d => ({
        ...d,
        fechatransaccion: this.formatYYYYMMDD(d.fechatransaccion),
        fechaingreso: this.formatISODateTime(d.fechaingreso),
      })),
    };
  }

  // ==========================================================
  //  2) GET BY ID  (GET /api/Anticipos/{idCabMaestro})
  // ==========================================================

  getAnticipoById(idCabMaestro: number): Observable<ApiResponse<AnticipoCgResponse>> {
    const url = `${this.baseUrl}/${idCabMaestro}`;
    return this.http.get<ApiResponse<AnticipoCgResponse>>(url);
  }

  // ==========================================================
  //  3) LISTADO  (GET /api/Anticipos/listado?fechaInicio=&fechaFinal=)
  // ==========================================================
/*
  getAnticiposListado(
    fechaInicio: Date | string,
    fechaFinal: Date | string
  ): Observable<ApiResponse<ListadoAsientoContableResponse[]>> {
    const params = new HttpParams()
      .set('fechaInicio', this.formatISODateTimeForParam(fechaInicio))
      .set('fechaFinal', this.formatISODateTimeForParam(fechaFinal));

    const url = `${this.baseUrl}/listado`;
    return this.http.get<ApiResponse<ListadoAsientoContableResponse[]>>(url, { params });
  }
*/

  // ==========================================================
  //  HELPERS DE FECHA
  // ==========================================================

  /**
   * Convierte Date (o string parseable) a 'YYYYMMDD' → para fechatransaccion.
   */
  private formatYYYYMMDD(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Convierte Date (o string) a 'YYYY-MM-DDTHH:mm:ss' → para fechaingreso.
   */
  private formatISODateTime(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Para los filtros del listado: usamos ISO completo que .NET mapea a DateTime.
   */
  private formatISODateTimeForParam(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString();
    }
    const d = new Date(date);
    return d.toISOString();
  }
}
