// src/app/services/notas-obs.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;            // "SUCCESS" / "ERROR" (insensible a mayúsculas)
  data: T;
  message: string;
  count: number;
}

export interface NotaObs {
  idNota: number;
  idCliente: number;
  ruc: string | null;
  nomcli: string | null;
  numnota: string;
  fecha: string | null;     // ISO del backend
  total: number | null;
  obsDetalle: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotasObsService {
  private baseUrl = environment.invoices_sic; // p. ej. http://localhost:5010/invoices-sic/api

  constructor(private http: HttpClient) {}

  /** GET /api/Facturacion/obs?anio=YYYY&usarAnioFactura=true */
  getNotasObsPorAnio(anio: number, usarAnioFactura = true): Observable<NotaObs[]> {
    const url = `${this.baseUrl}/Facturacion/obs`;
    const params = new HttpParams()
      .set('anio', String(anio))
      .set('usarAnioFactura', String(!!usarAnioFactura));

    return this.http.get<ApiResponse<NotaObs[]>>(url, { params }).pipe(
      map(resp => {
        const ok = (resp?.type ?? '').toLowerCase() === 'success';
        if (!ok) throw new Error(resp?.message || 'No se pudo obtener las notas.');
        return resp.data ?? [];
      }),
      catchError(err => {
        console.error('[NotasObsService] getNotasObsPorAnio error:', err);
        return throwError(() => err);
      })
    );
  }
}
