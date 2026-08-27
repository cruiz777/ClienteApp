// src/app/services/descuento.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError, tap } from 'rxjs';
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

// 🔹 Requests para POST / PUT
export interface DescuentoCreateRequest {
  descripcion: string;
  valor: number;
}

export interface DescuentoUpdateRequest {
  idDescuento: number;
  descripcion: string;
  valor: number;
}

@Injectable({ providedIn: 'root' })
export class DescuentoService {
  // Debe ser algo tipo: http://localhost:5010/invoices-sic/api
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
  getAll(opts: { debug?: boolean } = {}): Observable<Descuento[]> {
    return this.http.get<ApiResponse<DescuentoApi[]>>(this.url).pipe(
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

  /** Obtener un descuento por ID (si tu API lo expone) */
  getById(id: number): Observable<Descuento | null> {
    return this.http.get<ApiResponse<DescuentoApi>>(`${this.url}/${id}`).pipe(
      map(resp => (resp?.data ? this.mapDto(resp.data) : null)),
      catchError(err => throwError(() => err))
    );
  }

  /** Crear descuento – POST /api/Descuento
   *  Body esperado:
   *  { "descripcion": "string", "valor": 0 }
   */
  create(body: DescuentoCreateRequest): Observable<Descuento> {
    return this.http.post<ApiResponse<DescuentoApi>>(this.url, body).pipe(
      map(resp => this.mapDto(resp.data)),
      catchError(err => throwError(() => err))
    );
  }

  /** Actualizar descuento – PUT /api/Descuento/{id}
   *  Body esperado:
   *  { "id_descuento": 0, "descripcion": "string", "valor": 0 }
   */
  update(body: DescuentoUpdateRequest): Observable<Descuento> {
    // 👉 armamos el payload en snake_case tal como Swagger indica
    const payload = {
      id_descuento: body.idDescuento,
      descripcion: body.descripcion,
      valor: body.valor
    };

    return this.http
      .put<ApiResponse<DescuentoApi>>(`${this.url}/${body.idDescuento}`, payload)
      .pipe(
        map(resp => this.mapDto(resp.data)),
        catchError(err => throwError(() => err))
      );
  }

  /** Eliminar descuento (si el endpoint existe) */
  delete(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.url}/${id}`).pipe(
      map(resp => !!resp.data),
      catchError(err => throwError(() => err))
    );
  }
}
