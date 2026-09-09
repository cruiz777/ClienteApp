// services/autorizacion-caja.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {  catchError, throwError } from 'rxjs';
// interfaces
export interface AutorizacionCaja {
  id_autorizacion_caja: number;
  caja: string;
  numero_autorizacion: string;
  docini: number;
  docfin: number;
  fecini: string;
  fecfin: string;
  doc_sri: number;
  numero_factura: string;
  estado_factura: string;
  num_establecimiento: string;
  id_local: number;
  direccion: string;
  ruc: string;
  nombre_comercial: string;
  id_empresa: number;
  generar_xml: boolean;
  id_tipo_documento: number;
  numero_ncredito: string;
  estado_ncredito: string;
}
export interface UpdateAutorizacionCajaPayload {
  numero_autorizacion: string;
  numero_factura: string;
  estado_factura: string;
  num_establecimiento: string;
  direccion: string;
  ruc: string;
  nombre_comercial: string;
  generar_xml: boolean;
  numero_ncredito: string;
  estado_ncredito: string;
}

export interface CreateAutorizacionCajaPayload {
  caja: string;
  numero_autorizacion: string;
  docini?: number | null;
  docfin?: number | null;
  fecini?: string | Date | null;
  fecfin?: string | Date | null;
  doc_sri?: number | null;
  numero_factura?: string | null;
  estado_factura?: string | null;
  num_establecimiento: string;
  id_local: number;
  direccion?: string | null;
  ruc?: string | null;
  nombre_comercial?: string | null;
  id_empresa: number;
  generar_xml: boolean;
  id_tipo_documento?: number | null;
  numero_ncredito?: string | null;
  estado_ncredito?: string | null;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message: string;
}

export interface ApiResponse<T> {
  id: string;
  type: 'Success' | 'Error' | 'Info' | 'Warning'| 'Conflict';
  data: T;
  message: string;
  count: number | null;
}

@Injectable({ providedIn: 'root' })
export class CajaService {
  private http = inject(HttpClient);

  /**
   * Si environment.invoices_sic = 'http://localhost:5010/invoices-sic'
   * entonces endpoint = 'http://localhost:5010/invoices-sic/api/AutorizacionCaja'
   * Si YA tienes el endpoint completo en environment, puedes asignarlo directo.
   */
  private readonly endpoint =
    environment.invoices_sic.endsWith('/AutorizacionCaja')
      ? environment.invoices_sic
      : `${environment.invoices_sic}/AutorizacionCaja`;

  getAll(page = 1, pageSize = 10): Observable<PaginationResponse<AutorizacionCaja>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    return this.http
      .get<ApiResponse<PaginationResponse<AutorizacionCaja>>>(this.endpoint, { params })
      .pipe(map(resp => resp.data));
  }
  update(id: number, payload: UpdateAutorizacionCajaPayload) {
  return this.http
    .put<ApiResponse<AutorizacionCaja>>(`${this.endpoint}/${id}`, payload)
    .pipe(map(res => res.data));
}
create(payload: CreateAutorizacionCajaPayload): Observable<AutorizacionCaja> {
    // Normaliza fechas si vienen como Date
    const body = {
      ...payload,
      fecini: null,
      fecfin: null,
    };

    return this.http
      .post<ApiResponse<AutorizacionCaja>>(this.endpoint, body)
      .pipe(map(res => res.data));
  }
  // caja.service.ts (agrega este método)
existsCaja(
  num_establecimiento: string,
  caja: string,
  id_empresa: number,
  id_local: number
) {
  // ⚠️ Si el back no filtra, sube pageSize para tener más probabilidad de encontrar coincidencias
  const params = new HttpParams()
    .set('page', '1')
    .set('pageSize', '200'); // ajusta si esperas >200 cajas

  return this.http
    .get<ApiResponse<PaginationResponse<AutorizacionCaja>>>(this.endpoint, { params })
    .pipe(
      map(r => {
        const items = r.data?.items ?? [];
        // ✅ valida coincidencia exacta por los 4 campos
        return items.some(x =>
          (x.num_establecimiento ?? '').trim() === num_establecimiento.trim() &&
          (x.caja ?? '').trim() === caja.trim() &&
          Number(x.id_empresa) === Number(id_empresa) &&
          Number(x.id_local)   === Number(id_local)
        );
      })
    );
}

delete(id: number): Observable<void> {
  return this.http
    .delete<ApiResponse<boolean>>(`${this.endpoint}/${id}`, { observe: 'response' })
    .pipe(
      map((resp) => {
        // 204 No Content -> éxito
        if (resp.status === 204) return;

        const apiResp = resp.body as ApiResponse<boolean> | null | undefined;

        // Sin body pero 2xx -> considéralo éxito
        if (!apiResp) return;

        const type = (apiResp.type || '').toString().toLowerCase();

        // Acepta Success/OK y/o data === true como éxito
        if (type === 'success' || type === 'ok' || apiResp.data === true) return;

        if (type === 'conflict') {
          throw new Error(apiResp.message || 'No se puede eliminar: conflicto de integridad');
        }

        // NotFound: ya no existe; si quieres tratarlo como éxito "idempotente":
        if (type === 'notfound') {
          return; // opcional: coméntalo si prefieres mostrar error
        }

        // Cualquier otro tipo -> error con el mensaje del back si existe
        throw new Error(apiResp.message || 'Error al eliminar la autorización');
      }),
      catchError((err) => {
        const msg =
          err?.error?.message ??
          err?.message ??
          'Ocurrió un error al eliminar la AutorizacionCaja';
        return throwError(() => new Error(msg));
      })
    );
}

}
