import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';

import { TipoContribuyenteResponse } from '../interfaces/responses/tipo-contribuyente-response';
import { TipoContribuyenteRequest } from '../interfaces/requests/tipo-contribuyente-request';

@Injectable({ providedIn: 'root' })
export class TipoContribuyenteService {
  private readonly baseUrl = `${environment.maintenanceUrl}/TipoContribuyente`;
  constructor(private http: HttpClient) {}

  /** Lista normalizada y cacheada */
  ListadoAsiento(): Observable<TipoContribuyenteResponse[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((resp: any) => Array.isArray(resp) ? resp : (resp?.data ?? resp?.items ?? [])),
      map((list: any[]) => (list ?? []).map(x => ({
        IdTipoContribuyente: Number(x.IdTipoContribuyente) || 0,
        Descripcion: String(x.Descripcion ?? '').trim(),
        Codigoalterno: String(x.Codigoalterno ?? '').trim(),
      } as TipoContribuyenteResponse))),
      shareReplay(1),
      catchError(() => of([] as TipoContribuyenteResponse[]))
    );
  }

  
  /** Devuelve true si ya existe un TipAsiento (ignorando opcionalmente un Id para edición) 
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
 */

  getAll(): Observable<ApiListResponse<TipoContribuyenteResponse[]>> {
    return this.http.get<ApiListResponse<TipoContribuyenteResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<TipoContribuyenteResponse>> {
    return this.http.get<ApiResponse<TipoContribuyenteResponse>>(`${this.baseUrl}/${id}`);
  }

  create(data: TipoContribuyenteRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.baseUrl, data);
  }

  update(id: number, data: TipoContribuyenteRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  softDelete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
  }
}
