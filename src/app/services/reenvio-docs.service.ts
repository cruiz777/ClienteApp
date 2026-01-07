// src/app/services/reenvio-docs.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { DocumentoElectronicoListResponse } from '../interfaces/responses/reenvio-docs-electronicos-response';

@Injectable({
  providedIn: 'root'
})
export class ReenvioDocsService {
  private baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) { }

  /**
   * GET /DocumentosElectronicos/listado
   */
  getDocumentosElectronicos(
    tipoDocumento: 'FACTURA' | 'NC' | 'ND' | 'RETENCION',
    fechaInicio: Date | string,
    fechaFin: Date | string,
    numeroCaja?: string | null,
    page: number = 1,
    pageSize: number = 20
  ): Observable<ApiResponse<PaginationResponse<DocumentoElectronicoListResponse>>> {
    const url = `${this.baseUrl}/DocumentosElectronicos/listado`;

    let params = new HttpParams()
      .set('tipoDocumento', tipoDocumento)
      .set('fechaInicio', this.toLocalStartOfDay(fechaInicio))
      .set('fechaFin', this.toLocalEndOfDay(fechaFin))
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (numeroCaja?.trim()) {
      params = params.set('numeroCaja', numeroCaja.trim());
    }

    return this.http.get<ApiResponse<PaginationResponse<DocumentoElectronicoListResponse>>>(url, { params })
      .pipe(
        map(resp => {
          if (resp.type !== 'Success') {
            throw new Error(resp.message || 'Error al obtener documentos electrónicos');
          }
          return resp;
        }),
        catchError(err => {
          console.error('[ReenvioDocsService] getDocumentosElectronicos error:', err);
          return throwError(() => err);
        })
      );
  }

  private toLocalStartOfDay(date: Date | string): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  private toLocalEndOfDay(date: Date | string): string {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }
}
