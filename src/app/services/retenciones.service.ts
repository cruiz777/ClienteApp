import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

import { RetencionesResumenResponse } from 'src/app/interfaces/responses/retenciones-resumen-response';
import { RetencionesResponse } from '../interfaces/responses/retenciones-response';
import { RetencionesRequest } from '../interfaces/requests/retenciones-request';
import { RetencionesImpresionResponse } from 'src/app/interfaces/responses/retenciones-impresion-response';
import { GenerarXmlRetencionResponse } from '../interfaces/responses/generar-xml-retencion-response';


export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}

export interface CreateRetencionesResultResponse {
  secuencial: string;
  numestablecimiento?: string | null;
  puntoemision?: string | null;
  total: number;
  idsretencion: number[];
}

@Injectable({ providedIn: 'root' })
export class RetencionesService {
  private readonly baseUrl = `${environment.transactionUrl}/Retenciones`;

  constructor(private http: HttpClient) {}

  /** Para LISTADOS: si viene ERROR, devolvemos [] (NO lanzamos excepción) */
  private unwrapListOrEmpty<T>(resp: ApiResponse<T[]> | null | undefined): T[] {
    const type = (resp?.type ?? '').toUpperCase();
    if (type === 'ERROR') return [];
    return resp?.data ?? [];
  }

  /** Para OBJETOS (create/update): si viene ERROR, sí lanzamos excepción */
  private unwrapOrThrow<T>(resp: ApiResponse<T>): T {
    const type = (resp?.type ?? '').toUpperCase();
    if (type === 'ERROR') {
      const msg = resp?.message?.trim() || 'Error en el servidor.';
      throw new Error(msg);
    }
    return resp?.data as T;
  }

  getResumen(idEmpresa: number, idCabMaestro: number): Observable<RetencionesResumenResponse[]> {
    const params = new HttpParams()
      .set('idEmpresa', String(idEmpresa))
      .set('idCabMaestro', String(idCabMaestro));

    return this.http
      .get<ApiResponse<RetencionesResumenResponse[]>>(`${this.baseUrl}/resumen`, { params })
      .pipe(
        map(resp => this.unwrapListOrEmpty(resp)),
        catchError(() => of([]))
      );
  }

  /**
   * GET /Retenciones?idEmpresa=1&idCabMaestro=8
   * Importante: si el backend responde type="ERROR" por “no hay registros”,
   * aquí retornamos [] para que el componente continúe a /resumen.
   */
  getByCabecera(idEmpresa: number, idCabMaestro: number): Observable<RetencionesResponse[]> {
    const params = new HttpParams()
      .set('idEmpresa', String(idEmpresa))
      .set('idCabMaestro', String(idCabMaestro));

    return this.http
      .get<ApiResponse<RetencionesResponse[]>>(this.baseUrl, { params })
      .pipe(
        map(resp => this.unwrapListOrEmpty(resp)),
        catchError(() => of([]))
      );
  }


  /** POST /Retenciones/lote */
 /*
  createLote(req: RetencionesRequest[]): Observable<CreateRetencionesResultResponse> {
    return this.http
      .post<ApiResponse<CreateRetencionesResultResponse>>(`${this.baseUrl}/lote`, req)
      .pipe(
        map(resp => {
          const data = this.unwrapOrThrow(resp);
          // fallback defensivo
          return data ?? { secuencial: '', numestablecimiento: null, puntoemision: null, total: 0, idsretencion: [] };
        }),
        catchError(err => throwError(() => err))
      );
  }
  */

  /** POST /Retenciones  (lote de líneas) */
createLote(req: RetencionesRequest[]): Observable<CreateRetencionesResultResponse> {
  return this.http
    .post<ApiResponse<CreateRetencionesResultResponse>>(this.baseUrl, req)
    .pipe(
      map(resp => {
        const data = this.unwrapOrThrow(resp);
        return data ?? {
          secuencial: '',
          numestablecimiento: null,
          puntoemision: null,
          total: 0,
          idsretencion: []
        };
      }),
      catchError(err => {
        // Si el backend devuelve ApiResponse en el body del 400, extraemos message
        const backendMsg =
          err?.error?.message ||
          err?.error?.Message ||
          err?.message ||
          'Error al crear retenciones.';
        return throwError(() => new Error(backendMsg));
      })
    );
}

  /** PUT /Retenciones/{id} */
  update(idRetencion: number, request: RetencionesRequest): Observable<RetencionesResponse> {
    return this.http
      .put<ApiResponse<RetencionesResponse>>(`${this.baseUrl}/${idRetencion}`, request)
      .pipe(map(resp => this.unwrapOrThrow(resp)));
  }

  //impresion:

  getImpresion(idEmpresa: number, idCabMaestro: number): Observable<RetencionesImpresionResponse> {
  const params = new HttpParams()
    .set('idEmpresa', String(idEmpresa));

  return this.http
    .get<ApiResponse<RetencionesImpresionResponse>>(`${this.baseUrl}/${idCabMaestro}/impresion`, { params })
    .pipe(
      map(resp => this.unwrapOrThrow(resp)),
      catchError(err => {
        const backendMsg =
          err?.error?.message ||
          err?.error?.Message ||
          err?.message ||
          'Error al generar impresión de retenciones.';
        return throwError(() => new Error(backendMsg));
      })
    );
}
//////delete retenciones
/**
   * DELETE /Retenciones?idCabMaestro=65&idEmpresa=1&idUsuario=2
   * Retorna true si se eliminó (Type == DELETED). Caso contrario lanza Error con message del backend.
   */
   /**
   * DELETE /Retenciones?idCabMaestro=65&idEmpresa=1&idUsuario=2
   * Retorna true si el backend responde Type="DELETED".
   * Caso contrario lanza Error con message del backend.
   */
  deleteByCabecera(idCabMaestro: number, idEmpresa: number, idUsuario: number): Observable<boolean> {
    const params = new HttpParams()
      .set('idCabMaestro', String(idCabMaestro))
      .set('idEmpresa', String(idEmpresa))
      .set('idUsuario', String(idUsuario));

    return this.http
      .delete<ApiResponse<boolean>>(this.baseUrl, { params })
      .pipe(
        map(resp => this.unwrapDeletedOrThrow(resp)),
        catchError(err => {
          const backendMsg =
            err?.error?.message ||
            err?.error?.Message ||
            err?.message ||
            'Error al eliminar retenciones.';
          return throwError(() => new Error(backendMsg));
        })
      );
  }


    /** Para DELETE: éxito únicamente si Type == DELETED */
    private unwrapDeletedOrThrow(resp: ApiResponse<boolean>): boolean {
      const type = (resp?.type ?? '').toUpperCase();

      if (type === 'DELETED') return true;

      const msg = resp?.message?.trim() || 'No se pudo eliminar las retenciones.';
      throw new Error(msg);
    }

    ////

    /**
   * POST /Retenciones/{idRetencion}/xml
   * Genera el XML de retención y lo envía para autorización.
   */
  generarXml(idRetencion: number): Observable<GenerarXmlRetencionResponse> {
    return this.http
      .post<GenerarXmlRetencionResponse>(`${this.baseUrl}/${idRetencion}/xml`, null)
      .pipe(
        map(resp => {
          // Validación: si success es false, lanzamos error
          if (!resp.success) {
            throw new Error(resp.message || 'Error al generar XML de retención.');
          }
          return resp;
        }),
        catchError(err => {
          const backendMsg =
            err?.error?.message ||
            err?.error?.Message ||
            err?.message ||
            'Error al generar XML de retención.';
          return throwError(() => new Error(backendMsg));
        })
      );
  }
}
