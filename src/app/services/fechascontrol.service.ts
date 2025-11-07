import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { FechasControlResponse } from '../interfaces/responses/fechas-control-response';
import { FechasControlRequest } from '../interfaces/requests/fechas-control-request';
import { ApiResponse } from './producto.service';

@Injectable({ providedIn: 'root' })
export class FechasControlService {
  private readonly baseUrl = `${environment.maintenanceUrl}/FechasControl`;
  constructor(private http: HttpClient) {}

  /** Normaliza lista sin importar el shape del backend */
  private normalizeList(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.result)) return res.result;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    return [];
  }

  /** Normaliza propiedades comunes (casing y tipos) */
  private normalizeItem(x: any): any {
    return {
      ...x,
      IdEmpresa: Number(x?.IdEmpresa ?? x?.idEmpresa ?? 0),
      // Estado viene como TipoCon (A/I). Cubrimos variantes.
      TipoCon: String(x?.TipoCon ?? x?.tipocon ?? x?.TIPOCON ?? '').toUpperCase(),
    };
  }

  /**
   * ✅ Devuelve SIEMPRE un array filtrado por IdEmpresa y TipoCon.
   *    GET /FechasControl?IdEmpresa=1&TipoCon=A
   */
  getAll(opts?: {
    IdEmpresa?: number | null;
    TipoCon?: string | null; // 'A' / 'I'
  }): Observable<FechasControlResponse[]> {
    let params = new HttpParams();
    if (opts?.IdEmpresa != null) params = params.set('IdEmpresa', String(opts.IdEmpresa));
    if (opts?.TipoCon)          params = params.set('TipoCon', String(opts.TipoCon));

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map(res => {
        const raw = this.normalizeList(res).map(r => this.normalizeItem(r));
        const idEmp = opts?.IdEmpresa ?? null;
        const estado = (opts?.TipoCon ?? '').toUpperCase();

        // Filtro defensivo local
        return raw.filter(it => {
          const okEmp = idEmp == null ? true : Number(it.IdEmpresa) === Number(idEmp);
          const okEst = estado ? (String(it.TipoCon).toUpperCase() === estado) : true;
          return okEmp && okEst;
        }) as FechasControlResponse[];
      }),
      catchError(err => {
        console.error('FechasControlService.getAll error:', err);
        return of([] as FechasControlResponse[]);
      })
    );
  }

  getById(id: number): Observable<ApiResponse<FechasControlResponse>> {
    return this.http.get<ApiResponse<FechasControlResponse>>(`${this.baseUrl}/${id}`);
  }

  create(data: FechasControlRequest) {
    return this.http.post<ApiResponse<any>>(this.baseUrl, data);
  }

  update(id: number, data: FechasControlRequest) {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  softDelete(id: number) {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
  }
}
