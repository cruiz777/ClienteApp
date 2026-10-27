import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { TipoAsientoResponse } from '../interfaces/responses/tipo-asiento-response';
import { TipoAsientoRequest } from '../interfaces/requests/tipo-asiento-request';

@Injectable({ providedIn: 'root' })
export class TipoAsientoService {
  private readonly baseUrl = `${environment.maintenanceUrl}/TipoAsiento`;
  constructor(private http: HttpClient) {}

  /** Lista normalizada y cacheada */
  ListadoAsiento(): Observable<TipoAsientoResponse[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((resp: any) => Array.isArray(resp) ? resp : (resp?.data ?? resp?.items ?? [])),
      map((list: any[]) => (list ?? []).map(x => ({
        IdTipoAsiento: Number(x.IdTipoAsiento) || 0,
        TipAsiento: String(x.TipAsiento ?? '').trim(),
        Descripcion: String(x.Descripcion ?? '').trim(),
      } as TipoAsientoResponse))),
      shareReplay(1),
      catchError(() => of([] as TipoAsientoResponse[]))
    );
  }

  /** Devuelve true si ya existe un TipAsiento (ignorando opcionalmente un Id para edición) */
  existsTipAsiento(tipAsiento: string, excludeId?: number): Observable<boolean> {
    const needle = (tipAsiento ?? '').trim().toUpperCase();
    if (!needle) return of(false);

    return this.ListadoAsiento().pipe(
      map(list => list.some(x =>
        x.TipAsiento.trim().toUpperCase() === needle &&
        (excludeId ? x.IdTipoAsiento !== excludeId : true)
      ))
    );
  }

  getAll(): Observable<ApiListResponse<TipoAsientoResponse[]>> {
    return this.http.get<ApiListResponse<TipoAsientoResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<TipoAsientoResponse>> {
    return this.http.get<ApiResponse<TipoAsientoResponse>>(`${this.baseUrl}/${id}`);
  }

  create(data: TipoAsientoRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.baseUrl, data);
  }

  update(id: number, data: TipoAsientoRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  softDelete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
  }
}
