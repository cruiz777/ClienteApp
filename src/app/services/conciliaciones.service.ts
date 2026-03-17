// src/app/services/conciliaciones.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConciliacionSelectorResponse } from '../interfaces/responses/conciliacion-selector-response';
import { environment } from 'src/environments/environment';
import { MovimientoMaestroResponse } from '../interfaces/responses/movimiento-maestro-response';
import {
  CreateConciliacionRequest,
  UpdateConciliacionRequest,
  CreateConciliacionDetalleRequest,
  IsoDateLike, GuardarConciliacionParcialDetalleRequest, GuardarConciliacionParcialRequest
} from '../interfaces/requests/conciliacion-request';

import { ConciliacionResponse } from '../interfaces/responses/conciliacion-response';

/** ===== Respuesta estándar del API ===== */
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}
export interface SaldoContableInicialResponse {
  saldoContableInicial: number;
}
export interface TotalesContablesHastaFechaResponse {
  tDebe: number;
  tHaber: number;
  saldo: number;
}
@Injectable({
  providedIn: 'root',
})
export class ConciliacionesService {
  /**
   * Ajusta si tu controller se llama distinto:
   * - "Conciliaciones" (recomendado)
   * - "Conciliacion"
   */
  private readonly baseUrl = `${environment.conciliacionUrl}/Conciliaciones`;

  constructor(private http: HttpClient) { }

  // ==========================================================
  //  1) CREAR  (POST /Conciliaciones)
  // ==========================================================
  crearConciliacion(request: CreateConciliacionRequest): Observable<ApiResponse<number>> {
    const payload = this.mapConciliacionRequestToApi(request);
    return this.http.post<ApiResponse<number>>(this.baseUrl, payload);
  }

  // ==========================================================
  //  2) ACTUALIZAR  (PUT /Conciliaciones/{id})
  // ==========================================================
  actualizarConciliacion(
    idConciliacion: number,
    request: UpdateConciliacionRequest
  ): Observable<ApiResponse<number>> {
    const payload = this.mapConciliacionRequestToApi(request, idConciliacion);
    const url = `${this.baseUrl}/${idConciliacion}`;
    return this.http.put<ApiResponse<number>>(url, payload);
  }

  // ==========================================================
  //  3) GET BY ID  (GET /Conciliaciones/{id})
  // ==========================================================
  getConciliacionById(idConciliacion: number): Observable<ApiResponse<ConciliacionResponse>> {
    const url = `${this.baseUrl}/${idConciliacion}`;
    return this.http.get<ApiResponse<ConciliacionResponse>>(url);
  }

  ///obtener listado
  getConciliacionesSelector(): Observable<ApiResponse<ConciliacionSelectorResponse[]>> {
    const url = `${this.baseUrl}/selector`;
    return this.http.get<ApiResponse<ConciliacionSelectorResponse[]>>(url);
  }

  // GET conciliacion/api/Conciliaciones/movimientos-maestro?idPlanCuentas=9&fechaInicio=2026-01-01&fechaFin=2026-01-31
  getMovimientosMaestro(
    idPlanCuentas: number,
    fechaInicio: Date | string,
    fechaFin: Date | string
  ): Observable<ApiResponse<MovimientoMaestroResponse[]>> {

    const params = new HttpParams()
      .set('idPlanCuentas', String(idPlanCuentas))
      .set('fechaInicio', this.toDateOnly(fechaInicio))
      .set('fechaFin', this.toDateOnly(fechaFin));

    return this.http.get<ApiResponse<MovimientoMaestroResponse[]>>(
      `${this.baseUrl}/movimientos-maestro`,
      { params }
    );
  }

  private toDateOnly(v: Date | string): string {
    if (v instanceof Date) {
      const yyyy = v.getFullYear();
      const mm = String(v.getMonth() + 1).padStart(2, '0');
      const dd = String(v.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    // si viene ISO, toma YYYY-MM-DD
    const s = String(v);
    return s.length >= 10 ? s.substring(0, 10) : s;
  }
  // ==========================================================
  //  MAPPER: Request (Date|string) -> API payload (string ISO sin Z)
  // ==========================================================
  private mapConciliacionRequestToApi(
    req: CreateConciliacionRequest | UpdateConciliacionRequest,
    idConciliacionRuta?: number
  ): any {
    const fechaconcilCab = this.toIsoLocalMidnight(req.fechaconcil);

    return {
      // si quieres enviar idConciliacion también (opcional)
      ...(idConciliacionRuta ? { idConciliacion: idConciliacionRuta } : {}),
      ...(req as any),

      // CABECERA
      fechaconcil: fechaconcilCab,

      // DETALLES
      detalles: (req.detalles ?? []).map((d: CreateConciliacionDetalleRequest) => ({
        ...d,
        fechatran: this.toIsoLocalDateTime(d.fechatran), // conserva hora
        fechaconcil: this.toIsoLocalMidnight(d.fechaconcil ?? req.fechaconcil) ?? fechaconcilCab,
      })),
    };
  }

  // ==========================================================
  //  HELPERS DE FECHA (ISO sin Z, como tu ejemplo backend)
  // ==========================================================

  /**
   * Devuelve 'YYYY-MM-DDT00:00:00' (SIN Z) para fechas "solo día".
   */
  private toIsoLocalMidnight(value: IsoDateLike | null | undefined): string | null {
    if (!value) return null;

    // Si viene "YYYY-MM-DD"
    const s = value.toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return `${s}T00:00:00`;
    }

    // Si viene ISO con tiempo, tomamos solo la fecha
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      const datePart = s.substring(0, 10);
      return `${datePart}T00:00:00`;
    }

    // Si viene Date o string parseable
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T00:00:00`;
  }

  /**
   * Devuelve 'YYYY-MM-DDTHH:mm:ss' (SIN Z) para DateTime con hora.
   */
  private toIsoLocalDateTime(value: IsoDateLike | null | undefined): string | null {
    if (!value) return null;

    const s = value.toString().trim();

    // Si ya viene como "YYYY-MM-DDTHH:mm:ss" (o con ms/Z), normalizamos a 19 chars
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
      // quita milisegundos y/o Z si existen
      const base = s.replace('Z', '');
      return base.length >= 19 ? base.substring(0, 19) : base;
    }

    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }
  guardarParcial(request: GuardarConciliacionParcialRequest): Observable<ApiResponse<number>> {
    const payload = {
      fechaconcil: this.toIsoLocalMidnight(request.fechaconcil),
      detalles: (request.detalles ?? []).map(d => ({
        idDetMaestro: d.idDetMaestro,
        concil: d.concil
      }))
    };

    return this.http.put<ApiResponse<number>>(`${this.baseUrl}/parcial`, payload);
  }
  // GET conciliacion/api/Conciliaciones/saldo-contable-inicial?codprePc=110102-002&fechaCorte=01/01/2026
  getSaldoContableInicial(
    codprePc: string,
    fechaCorte: string // dd/MM/yyyy
  ): Observable<ApiResponse<SaldoContableInicialResponse>> {

    const params = new HttpParams()
      .set('codprePc', String(codprePc ?? '').trim())
      .set('fechaCorte', String(fechaCorte ?? '').trim()); // ejemplo: "01/01/2026"

    return this.http.get<ApiResponse<SaldoContableInicialResponse>>(
      `${this.baseUrl}/saldo-contable-inicial`,
      { params }
    );
  }
  getTotalesContablesHastaFecha(
  codprePc: string,
  fechaCorte: string // dd/MM/yyyy
): Observable<ApiResponse<TotalesContablesHastaFechaResponse>> {

  const params = new HttpParams()
    .set('codprePc', String(codprePc ?? '').trim())
    .set('fechaCorte', String(fechaCorte ?? '').trim());

  return this.http.get<ApiResponse<TotalesContablesHastaFechaResponse>>(
    `${this.baseUrl}/totales-contables-hasta-fecha`,
    { params }
  );
}
}