// src/app/services/descuento.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError,tap } from 'rxjs';
import { environment } from 'src/environments/environment';


export interface ApiResponse<T> {
  id: string;
  type: 'Success' | 'Error' | string;
  data: T;
  message: string;
  count: number;
}

// 🔹 Lo que devuelve el backend (snake_case)
export interface DescuentoApi {
  id_descuento: number;
  descripcion: string;
  valor: number;               // porcentaje (0–100)
  valor_formateado: string;    // ej: "10%"
}

// 🔹 Modelo en el front (camelCase)
export interface Descuento {
  idDescuento: number;
  descripcion: string;
  valor: number;               // porcentaje (0–100)
  valorFormateado: string;     // ej: "10%"
}

@Injectable({ providedIn: 'root' })
export class DescuentoService {
  // Ajusta esta base si tu env usa otro nombre
  private readonly base = environment.invoices_sic ?? '';
  private readonly url = `${this.base}/Descuento`;

  constructor(private http: HttpClient) {}

  // --- helpers de mapeo ---
  private mapDto = (x: DescuentoApi): Descuento => ({
    idDescuento: x.id_descuento,
    descripcion: x.descripcion,
    valor: x.valor,
    valorFormateado: x.valor_formateado
  });

  // ====== ENDPOINTS ======

  /** Obtener todos los descuentos (sin paginación) */
// descuento.service.ts
getAll(opts: { debug?: boolean } = {}): Observable<Descuento[]> {
  return this.http.get<ApiResponse<DescuentoApi[]>>(`${this.url}`).pipe(
    // 👉 ver respuesta cruda del back (snake_case)
    tap(resp => {
      if (opts.debug) {
        console.log('[DescuentoService] RAW response:', resp);
        console.table(resp?.data ?? []);
      }
    }),
    // mapear a tu modelo del front (camelCase)
    map(resp => (resp.data ?? []).map(this.mapDto)),
    // 👉 ver lista ya mapeada
    tap(list => {
      if (opts.debug) {
        console.log('[DescuentoService] MAPPED list:', list);
        console.table(list);
      }
    }),
    catchError(err => {
      if (opts.debug) console.error('[DescuentoService] error:', err);
      return throwError(() => err);
    })
  );
}


  /** Obtener un descuento por ID */
  getById(id: number): Observable<Descuento | null> {
    return this.http.get<ApiResponse<DescuentoApi>>(`${this.url}/${id}`).pipe(
      map(resp => resp?.data ? this.mapDto(resp.data) : null),
      catchError(err => throwError(() => err))
    );
  }

  /** Crear descuento */
  create(body: { descripcion: string; valor: number }): Observable<Descuento> {
    return this.http.post<ApiResponse<DescuentoApi>>(this.url, body).pipe(
      map(resp => this.mapDto(resp.data)),
      catchError(err => throwError(() => err))
    );
  }

  /** Actualizar descuento */
  update(body: { idDescuento: number; descripcion: string; valor: number }): Observable<Descuento> {
    return this.http.put<ApiResponse<DescuentoApi>>(`${this.url}/${body.idDescuento}`, body).pipe(
      map(resp => this.mapDto(resp.data)),
      catchError(err => throwError(() => err))
    );
  }

  /** Eliminar descuento */
  delete(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.url}/${id}`).pipe(
      map(resp => !!resp.data),
      catchError(err => throwError(() => err))
    );
  }
}
