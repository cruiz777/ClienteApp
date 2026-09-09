// src/app/services/autorizacion-caja.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError, firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  TipoDocumentoSriService,
  TipoDocumentoSriResponse,
  ApiResponse as ApiResponseTipoDoc,
  PaginationResponse as PaginationResponseTipoDoc,
} from 'src/app/services/tipo-documento-sri.service';

@Injectable({ providedIn: 'root' })
export class AutorizacionCajaService {
  private apiBaseUrl = environment.invoices_sic; // ej: http://localhost:5010/invoices-sic/api

  // =======================
  // Cache Tipos Documento SRI (NO QUEMADO)
  // =======================
  private tiposDocMap = new Map<number, string>();
  private tiposDocCargados = false;

  constructor(
    private http: HttpClient,
    private tipoDocSriService: TipoDocumentoSriService
  ) {}

  // =======================
  // Helpers text/plain
  // =======================
  private headersTextPlain(): HttpHeaders {
    // tu swagger pide Accept:text/plain aunque el contenido sea JSON
    return new HttpHeaders({ Accept: 'text/plain', 'Content-Type': 'application/json' });
  }

  private parseText<T>(t: string): T {
    return JSON.parse(t) as T;
  }

  // =======================
  // Cargar catálogo TipoDocumentoSri (1 sola vez)
  // =======================
  async ensureTiposDocumentoLoaded(): Promise<void> {
    if (this.tiposDocCargados) return;

    const resp = await firstValueFrom(
      this.tipoDocSriService.getAll(1, 9999) as Observable<ApiResponseTipoDoc<PaginationResponseTipoDoc<TipoDocumentoSriResponse>>>
    );

    if ((resp.type || '').toLowerCase() === 'success') {
      const items = resp.data?.items ?? [];
      this.tiposDocMap.clear();

      items.forEach((x: TipoDocumentoSriResponse) => {
        if (x?.idTipoDocumento != null) {
          this.tiposDocMap.set(x.idTipoDocumento, (x.descripcion ?? '').trim());
        }
      });

      this.tiposDocCargados = true;
    }
  }

  /** ✅ Label dinámico (ya NO quemado) */
  tipoDocumentoLabel(idTipoDocumento?: number | null): string {
    if (idTipoDocumento == null) return '—';
    return this.tiposDocMap.get(idTipoDocumento) || `TIPO ${idTipoDocumento}`;
  }

  // =======================
  // ENDPOINTS AutorizacionCaja
  // =======================

  /** ✅ GET por ID */
  getAutorizacionCaja(id: number): Observable<ApiResponse<AutorizacionCaja>> {
    const headers = this.headersTextPlain();
    return this.http
      .get(`${this.apiBaseUrl}/AutorizacionCaja/${id}`, { headers, responseType: 'text' })
      .pipe(
        map(t => this.parseText<ApiResponse<AutorizacionCaja>>(t)),
        catchError(this.handleError)
      );
  }

  /** ✅ LISTADO PAGINADO */
  getPaged(page: number, pageSize: number): Observable<ApiResponse<PagedData<AutorizacionCaja>>> {
    const headers = this.headersTextPlain();
    return this.http
      .get(`${this.apiBaseUrl}/AutorizacionCaja?page=${page}&pageSize=${pageSize}`, { headers, responseType: 'text' })
      .pipe(
        map(t => this.parseText<ApiResponse<PagedData<AutorizacionCaja>>>(t)),
        catchError(this.handleError)
      );
  }

  /** ✅ CREATE (POST) */
  create(req: AutorizacionCajaUpsertRequest): Observable<ApiResponse<AutorizacionCaja>> {
    const headers = this.headersTextPlain();

    // Si tu controller espera { request: req }, cambia esta línea por:
    // return this.http.post(`${...}/AutorizacionCaja`, { request: req }, ...)
    return this.http
      .post(`${this.apiBaseUrl}/AutorizacionCaja`, req, { headers, responseType: 'text' })
      .pipe(
        map(t => this.parseText<ApiResponse<AutorizacionCaja>>(t)),
        catchError(this.handleError)
      );
  }

  /** ✅ UPDATE (PUT) */
  update(id: number, req: AutorizacionCajaUpsertRequest): Observable<ApiResponse<AutorizacionCaja>> {
    const headers = this.headersTextPlain();

    // Si tu controller espera { request: req }, cambia esta línea por:
    // return this.http.put(`${...}/AutorizacionCaja/${id}`, { request: req }, ...)
    return this.http
      .put(`${this.apiBaseUrl}/AutorizacionCaja/${id}`, req, { headers, responseType: 'text' })
      .pipe(
        map(t => this.parseText<ApiResponse<AutorizacionCaja>>(t)),
        catchError(this.handleError)
      );
  }

  private handleError(err: any) {
    console.error('AutorizacionCaja error', err);
    return throwError(() => err);
  }
}

/* ======================= Tipos ======================= */

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string | null;
  count: number | null;
}

export interface PagedData<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message?: string;
}

export interface AutorizacionCaja {
  id_autorizacion_caja: number;
  caja: string;
  numero_autorizacion: string;

  docini: number | null;
  docfin: number | null;

  fecini: string | null;
  fecfin: string | null;

  numero: string | null;
  estado: string | null;

  num_establecimiento: string | null;
  id_local: number | null;

  direccion: string | null;
  ruc: string | null;
  nombre_comercial: string | null;

  id_empresa: number | null;
  generar_xml: boolean | null;

  id_tipo_documento: number | null;
  sucursal: string | null;
  produccion: number | null;

  tipo_documento_descripcion: string | null;
}

/** ✅ Request para crear/editar */
export type AutorizacionCajaUpsertRequest =
  Partial<Omit<AutorizacionCaja, 'id_autorizacion_caja' | 'tipo_documento_descripcion'>>;
