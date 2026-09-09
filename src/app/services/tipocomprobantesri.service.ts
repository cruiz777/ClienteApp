import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { TipoComprobanteSriRequest } from '../interfaces/requests/tipo-comprobantesri-request';
import { TipoComprobanteSriResponse } from '../interfaces/responses/tipo-comprobantesri-response';

type Row = TipoComprobanteSriResponse & { Codtipcomp: string };

@Injectable({ providedIn: 'root' })
export class TipoComprobanteSriService {
  private readonly baseUrl = `${environment.maintenanceUrl}/tipocomprobantesri`;
  constructor(private http: HttpClient) {}

  /** Extrae un array de cualquier shape común (data, result, items, etc.) */
  private pickArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.result)) return res.result;
    if (Array.isArray(res?.resultado)) return res.resultado;

    // Algunos backends envían { data: { items: [...] } } o { result: { items: [...] } }
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.result?.items)) return res.result.items;
    if (Array.isArray(res?.resultado?.items)) return res.resultado.items;

    return [];
  }

  /** Normaliza a un array tipado con Codtipcomp en MAYÚSCULAS y TRIM */
  private normalizeList(res: any): Row[] {
    const raw = this.pickArray(res);
    return (raw ?? []).map((x: any) => ({
      IdTipoCompSri: Number(x.IdTipoCompSri ?? x.idTipoCompSri ?? x.id) || 0,
      Codtipcomp: String(
        x.Codtipcomp ?? x.codtipcomp ?? x.CodTipComp ?? x.codTipComp ?? x.codigo ?? x.codigo_tipo_comp
      ).trim().toUpperCase(),
      Destipcomp: String(x.Destipcomp ?? x.destipcomp ?? '').trim(),
      Sustentotrib: String(x.Sustentotrib ?? x.sustentotrib ?? '').trim(),
    }));
  }

  /** Lista cacheada (para validación y combos) */
  Listado(): Observable<Row[]> {
    return this.getAll().pipe(
      map((resp: ApiListResponse<TipoComprobanteSriResponse[]>) => this.normalizeList(resp)),
      shareReplay({ bufferSize: 1, refCount: true }),
      catchError(() => of([] as Row[]))
    );
  }

  /** True si ya existe el codtipcomp (excluye un Id al editar) */
  existsCodtipcomp(codtipcomp: string, excludeId?: number): Observable<boolean> {
    const needle = (codtipcomp ?? '').trim().toUpperCase();
    if (!needle) return of(false);
    return this.Listado().pipe(
      map(list =>
        list.some(x =>
          x.Codtipcomp === needle &&
          (excludeId !== undefined && excludeId !== null ? x.IdTipoCompSri !== excludeId : true)
        )
      )
    );
  }

  // CRUD “oficial”
  getAll(): Observable<ApiListResponse<TipoComprobanteSriResponse[]>> {
    return this.http.get<ApiListResponse<TipoComprobanteSriResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<TipoComprobanteSriResponse>> {
    return this.http.get<ApiResponse<TipoComprobanteSriResponse>>(`${this.baseUrl}/${id}`);
  }

  create(data: TipoComprobanteSriRequest): Observable<ApiResponse<any>> {
    // Asegura mayúsculas antes de enviar
    (data as any).Codtipcomp = (data as any).Codtipcomp?.toString().trim().toUpperCase() ?? '';
    return this.http.post<ApiResponse<any>>(this.baseUrl, data);
  }

  update(id: number, data: TipoComprobanteSriRequest): Observable<ApiResponse<any>> {
    (data as any).Codtipcomp = (data as any).Codtipcomp?.toString().trim().toUpperCase() ?? '';
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  softDelete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
  }
}
