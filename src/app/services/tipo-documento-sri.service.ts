import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id?: string;
  type: string;
  data: T | null;
  message?: string;
  count?: number | null;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  message?: string;
}

export interface TipoDocumentoSriResponse {
  idTipoDocumento: number;
  descripcion: string | null;
  documentoSri: string | null;
}

export interface CreateTipoDocumentoSriRequest {
  descripcion: string | null;
  documentoSri: string | null;
}

export interface UpdateTipoDocumentoSriRequest {
  idTipoDocumento: number;
  descripcion: string | null;
  documentoSri: string | null;
}

@Injectable({ providedIn: 'root' })
export class TipoDocumentoSriService {
  private readonly baseUrl = `${environment.invoices_sic}/TipoDocumentoSri`;

  constructor(private http: HttpClient) {}

  private headersTextPlain(): HttpHeaders {
    return new HttpHeaders({ Accept: 'text/plain', 'Content-Type': 'application/json' });
  }

  private parseText<T>(t: string): T {
    return JSON.parse(t) as T;
  }

  /** GET paginado (Swagger: text/plain) */
  getAll(page: number = 1, pageSize: number = 10): Observable<ApiResponse<PaginationResponse<TipoDocumentoSriResponse>>> {
    const headers = this.headersTextPlain();
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    return this.http
      .get(this.baseUrl, { headers, params, responseType: 'text' })
      .pipe(map(t => this.parseText<ApiResponse<PaginationResponse<TipoDocumentoSriResponse>>>(t)));
  }

  /** GET por id */
  getById(id: number): Observable<ApiResponse<TipoDocumentoSriResponse>> {
    const headers = this.headersTextPlain();
    return this.http
      .get(`${this.baseUrl}/${id}`, { headers, responseType: 'text' })
      .pipe(map(t => this.parseText<ApiResponse<TipoDocumentoSriResponse>>(t)));
  }

  /** POST */
  create(request: CreateTipoDocumentoSriRequest): Observable<ApiResponse<TipoDocumentoSriResponse>> {
    const headers = this.headersTextPlain();
    return this.http
      .post(this.baseUrl, request, { headers, responseType: 'text' })
      .pipe(map(t => this.parseText<ApiResponse<TipoDocumentoSriResponse>>(t)));
  }

  /** PUT */
  update(id: number, request: UpdateTipoDocumentoSriRequest): Observable<ApiResponse<TipoDocumentoSriResponse>> {
    const headers = this.headersTextPlain();
    return this.http
      .put(`${this.baseUrl}/${id}`, request, { headers, responseType: 'text' })
      .pipe(map(t => this.parseText<ApiResponse<TipoDocumentoSriResponse>>(t)));
  }

  /** ✅ Helper: traer todo el catálogo (pageSize grande) */
  getCatalogo(): Observable<ApiResponse<PaginationResponse<TipoDocumentoSriResponse>>> {
    return this.getAll(1, 9999);
  }
}
