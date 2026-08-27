import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { BancosResponse } from '../interfaces/responses/bancos-response';
import { BancosRequest } from '../interfaces/requests/bancos-request';


@Injectable({ providedIn: 'root' })

export class BancosService {
  //private readonly baseUrl = environment.maintenanceUrl ?? '/TipoRetencion';      // e.g. 'http://localhost:5010'
  private readonly baseUrl = `${environment.maintenanceUrl}/Bancos`;
  constructor(private http: HttpClient) {}

  /*
  getAll(): Observable<ApiListResponse<BancosResponse[]>> {
     return this.http.get<ApiListResponse<BancosResponse[]>>(this.baseUrl);
   }
 */

   getAll(opts?: { idEmpresa?: number; estado?: string }): Observable<ApiListResponse<BancosResponse[]>> {
    let params = new HttpParams();
    if (opts?.idEmpresa != null) params = params.set('idEmpresa', String(opts.idEmpresa));
    if (opts?.estado) params = params.set('estado', opts.estado);

    return this.http.get<ApiListResponse<BancosResponse[]>>(this.baseUrl, { params });
  }
  
   getById(id: number): Observable<ApiResponse<BancosResponse>> {
     return this.http.get<ApiResponse<BancosResponse>>(`${this.baseUrl}/${id}`);
   }
 
   create(data: BancosRequest): Observable<ApiResponse<any>> {
     return this.http.post<ApiResponse<any>>(this.baseUrl, data);
   }
 
   update(id: number, data: BancosRequest): Observable<ApiResponse<any>> {
     return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
   }
 
   delete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
   }
 
   softDelete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
   }
}
