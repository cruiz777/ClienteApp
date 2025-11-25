import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { map , shareReplay } from 'rxjs/operators';

import { CodigosEspecialesResponse } from '../interfaces/responses/codigos-especiales-response';
import { CodigosEspecialesRequest } from '../interfaces/requests/codigos-especiales-request';

//hr para combos
export type CodigoEspecialOpcion = { id: number; label: string };

@Injectable({ providedIn: 'root' })

export class CodigosEspecialesService {
  //private readonly baseUrl = environment.maintenanceUrl ?? '/TipoRetencion';      // e.g. 'http://localhost:5010'
  private readonly baseUrl = `${environment.maintenanceUrl}/CodigosEspeciales`;
  constructor(private http: HttpClient) {}


  // ✅ listado para combos: id ↔ label para combos
  ListadoCodigosEspeciales(): Observable<CodigoEspecialOpcion[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      // desenvuelve: array directo, {data}, {items}, {result}
      map((resp: any) => Array.isArray(resp) ? resp : (resp?.data ?? resp?.items ?? resp?.result ?? [])),
      // normaliza nombres de campos: soporta id_codigo_especial / IdCodigoEspecial / Codespecial / id
      map((list: any[]) => (list ?? []).map(x => {
        const id = Number(
          x.id_codigo_especial ?? x.IdCodigoEspecial ?? x.Codespecial ?? x.id ?? 0
        );
        const label = String(
          x.desc_especial ?? x.Descespecial ?? x.descripcion ?? x.nombre ?? x.Descripcion ?? ''
        ).trim();
        return { id, label };
      }).filter(o => o.id > 0)),
      shareReplay(1)
    );
  }

  getAll(): Observable<ApiListResponse<CodigosEspecialesResponse[]>> {
     return this.http.get<ApiListResponse<CodigosEspecialesResponse[]>>(this.baseUrl);
   }
 
   getById(id: number): Observable<ApiResponse<CodigosEspecialesResponse>> {
     return this.http.get<ApiResponse<CodigosEspecialesResponse>>(`${this.baseUrl}/${id}`);
   }
 
   create(data: CodigosEspecialesRequest): Observable<ApiResponse<any>> {
     return this.http.post<ApiResponse<any>>(this.baseUrl, data);
   }
 
   update(id: number, data: CodigosEspecialesRequest): Observable<ApiResponse<any>> {
     return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
   }
 
   delete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
   }
 
   softDelete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
   }
}
