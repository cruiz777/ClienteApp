import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';

import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { environment } from 'src/environments/environment';
import { TipoRetencionResponse } from '../interfaces/responses/tipo-retencion-response';
import { TipoRetencionRequest } from '../interfaces/requests/tipo-retencion-request';

@Injectable({ providedIn: 'root' })
export class TipoRetencionService {
  private readonly baseUrl = `${environment.maintenanceUrl}/tiporetencion`;

  // Caché de códigos normalizados (UPPER + trim)
  private _codesCache: Set<string> | null = null;
  private _codesLoader$?: Observable<Set<string>>;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiListResponse<TipoRetencionResponse[]>> {
    return this.http.get<ApiListResponse<TipoRetencionResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<TipoRetencionResponse>> {
    return this.http.get<ApiResponse<TipoRetencionResponse>>(`${this.baseUrl}/${id}`);
  }

  create(data: TipoRetencionRequest): Observable<ApiResponse<any>> {
    const payload: TipoRetencionRequest = {
      ...data,
      CodigoTipoRet: (data.CodigoTipoRet ?? '').trim().toUpperCase(),
      Porcentaje: Math.max(0, Number(data.Porcentaje ?? 0))
    };
    return this.http.post<ApiResponse<any>>(this.baseUrl, payload).pipe(
      tap(() => this.invalidateCodesCache())
    );
  }

  update(id: number, data: TipoRetencionRequest): Observable<ApiResponse<any>> {
    const payload: TipoRetencionRequest = {
      ...data,
      CodigoTipoRet: (data.CodigoTipoRet ?? '').trim().toUpperCase(),
      Porcentaje: Math.max(0, Number(data.Porcentaje ?? 0))
    };
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, payload).pipe(
      tap(() => this.invalidateCodesCache())
    );
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCodesCache())
    );
  }

  softDelete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`).pipe(
      tap(() => this.invalidateCodesCache())
    );
  }

  /** Calienta/precarga el caché. Llamar en ngOnInit del componente. */
  warmCodesCache(): Observable<Set<string>> {
    return this.loadCodes();
  }

  /** Snapshot sincronizado para validadores locales. */
  getCodesSnapshot(): Set<string> {
    return this._codesCache ?? new Set<string>();
  }

  /** TRUE si el código existe (usa caché; si no está cargado, lo carga 1 vez). */
  existsByCodigo(codigo: string): Observable<boolean> {
    const code = (codigo ?? '').trim().toUpperCase();
    if (!code) return of(false);
    return this.loadCodes().pipe(map(set => set.has(code)));
  }

  // -------------------- Privados --------------------
  private loadCodes(): Observable<Set<string>> {
    if (this._codesCache) return of(this._codesCache);
    if (this._codesLoader$) return this._codesLoader$;

    this._codesLoader$ = this.getAll().pipe(
      map(resp => {
        const arr = resp?.data ?? [];
        const set = new Set(
          arr
            .map(x => (x.CodigoTipoRet ?? '').toString().trim().toUpperCase())
            .filter(Boolean)
        );
        return set;
      }),
      tap(set => {
        this._codesCache = set;
        this._codesLoader$ = undefined;
      }),
      shareReplay(1),
      catchError(() => {
        this._codesLoader$ = undefined;
        // En error: deja set vacío para no romper validaciones
        return of(new Set<string>());
      })
    );

    return this._codesLoader$;
  }

  private invalidateCodesCache(): void {
    this._codesCache = null;
    this._codesLoader$ = undefined;
  }
}
