import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CodigosContablesRequest } from '../interfaces/requests/codigos-contables-request';
import { CodigosContablesResponse } from '../interfaces/responses/codigos-contables-response';

type ApiListResponse<T> = { ok: boolean; data: T; count?: number | null; message?: string | null; };
type ApiResponse<T>    = { ok: boolean; data: T; message?: string | null; };
///para buscar codigos contables
type ApiNetResponse<T> = {
  id: string;
  type: string;        // "LIST", "ERROR", etc.
  data: T;
  message?: string | null;
};

@Injectable({ providedIn: 'root' })
export class CodigosContablesService {
  private readonly baseUrl = `${environment.maintenanceUrl}/codigoscontables`;

  constructor(private http: HttpClient) {}

  getAll(opts?: { idEmpresa?: number }): Observable<ApiListResponse<CodigosContablesResponse[]>> {
    let params = new HttpParams();
    if (opts?.idEmpresa != null) params = params.set('idEmpresa', String(opts.idEmpresa));
    return this.http.get<ApiListResponse<CodigosContablesResponse[]>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<CodigosContablesResponse>> {
    return this.http.get<ApiResponse<CodigosContablesResponse>>(`${this.baseUrl}/${id}`);
  }

  // 🔍 Nuevo método: buscar para autocompletar / combo
  // GET /codigoscontables/buscar?idEmpresa=1&term=ABC&maxResults=20
  buscar(
    term: string,
    opts: { idEmpresa: number; maxResults?: number }
  ): Observable<ApiNetResponse<CodigosContablesResponse[]>> {

    let params = new HttpParams()
      .set('idEmpresa', String(opts.idEmpresa))
      .set('term', term?.trim() ?? '');

    if (opts.maxResults != null) {
      params = params.set('maxResults', String(opts.maxResults));
    }

    // coincide con tu endpoint: /CodigosContables/search
    return this.http.get<ApiNetResponse<CodigosContablesResponse[]>>(
      `${this.baseUrl}/search`,
      { params }
    );
  }

  // Valida identificación única por empresa (excluye un IdCodContable opcional para edición)
  exists(identificacion: string, idEmpresa: number, excludeId?: number): Observable<boolean> {
    let params = new HttpParams()
      .set('identificacion', identificacion)
      .set('idEmpresa', String(idEmpresa));
    if (excludeId != null) params = params.set('excludeId', String(excludeId));
    return this.http.get<boolean>(`${this.baseUrl}/exists`, { params });
  }

     create(data: CodigosContablesRequest): Observable<ApiResponse<any>> {
       return this.http.post<ApiResponse<any>>(this.baseUrl, data);
     }
   
     update(id: number, data: CodigosContablesRequest): Observable<ApiResponse<any>> {
       return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
     }
   
     delete(id: number): Observable<ApiResponse<any>> {
       return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
     }
   
     softDelete(id: number): Observable<ApiResponse<any>> {
       return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
     }

     /*
  create(payload: CodigosContablesRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.baseUrl, payload);
  }

  update(id: number, payload: CodigosContablesRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, payload);
  }

  /** (Opcional) eliminar duro 
  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }

  /** (Opcional) eliminar lógico 
  softDelete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/soft-delete/${id}`);
  }

*/
  
}
