// src/app/services/tipocuenta.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface TipoCuenta {
  Tipcue: string;
  Destip: string;
  Tranban: string;
  IdTipoCuenta: number;
}

export interface ApiResponseListTipoCuenta {
  id: string;
  type: 'LIST';
  data: TipoCuenta[];
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TipoCuentaService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.maintenanceUrl}/tipocuenta`;

  getAll(): Observable<TipoCuenta[]> {
    return this.http.get<ApiResponseListTipoCuenta>(this.baseUrl).pipe(
      map(res => res.data ?? []),
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<TipoCuenta> {
    return this.http.get<TipoCuenta>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  create(payload: Omit<TipoCuenta, 'IdTipoCuenta'>): Observable<TipoCuenta> {
    return this.http.post<TipoCuenta>(this.baseUrl, payload)
      .pipe(catchError(this.handleError));
  }

  update(id: number, payload: Partial<TipoCuenta>): Observable<TipoCuenta> {
    return this.http.put<TipoCuenta>(`${this.baseUrl}/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** Verifica duplicado (case-insensitive). */
  existsByTipcue(tipcue: string): Observable<boolean> {
    const val = (tipcue ?? '').trim().toUpperCase();
    if (!val) return new Observable<boolean>(sub => { sub.next(false); sub.complete(); });

    return this.getAll().pipe(
      map(list => list.some(x => (x.Tipcue ?? '').trim().toUpperCase() === val))
    );
  }

  private handleError = (error: any) => {
    const msg = error?.error?.message || error?.message || 'Error de red';
    return throwError(() => new Error(msg));
  };
}
