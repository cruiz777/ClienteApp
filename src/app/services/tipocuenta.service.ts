// src/app/services/tipocuenta.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface TipoCuenta {
  Tipcue: string;        // "R"
  Destip: string;        // "RT. EN LA FUENTE"
  Tranban: string;       // "N"
  IdTipoCuenta: number;  // 1
}

export interface ApiResponseListTipoCuenta {
  id: string;            // "f6fc8bf4-7527-45e5-85c6-93d57ee79364"
  type: 'LIST';
  data: TipoCuenta[];
  message: string;       // "Retrieved successfully"
}

@Injectable({ providedIn: 'root' })
export class TipoCuentaService {
  private http = inject(HttpClient);

  // Ajusta esta URL a tu backend real
  private readonly baseUrl = `${environment.maintenanceUrl}/tipocuenta`;

    /** Devuelve solo la lista mapeada desde `data` */
  getAll(): Observable<TipoCuenta[]> {
    return this.http.get<ApiResponseListTipoCuenta>(this.baseUrl).pipe(
      map(res => res.data ?? []),
      catchError(this.handleError)
    );
  }

  /** Si tu API soporta GET por id */
  getById(id: number): Observable<TipoCuenta> {
    return this.http.get<TipoCuenta>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** Si tu API soporta crear */
  create(payload: Omit<TipoCuenta, 'IdTipoCuenta'>): Observable<TipoCuenta> {
    return this.http.post<TipoCuenta>(this.baseUrl, payload)
      .pipe(catchError(this.handleError));
  }

  /** Si tu API soporta actualizar */
  update(id: number, payload: Partial<TipoCuenta>): Observable<TipoCuenta> {
    return this.http.put<TipoCuenta>(`${this.baseUrl}/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  /** Si tu API soporta eliminar */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError = (error: any) => {
    const msg = error?.error?.message || error?.message || 'Error de red';
    return throwError(() => new Error(msg));
  };
}
