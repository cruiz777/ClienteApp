import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { BancosTercerosResponse } from '../interfaces/responses/bancos-terceros-response';
import { BancosTercerosRequest } from '../interfaces/requests/bancos-terceros-request';

@Injectable({ providedIn: 'root' })

export class BancosTercerosService {
  //private readonly baseUrl = environment.maintenanceUrl ?? '/TipoRetencion';      // e.g. 'http://localhost:5010'
  private readonly baseUrl = `${environment.maintenanceUrl}/BancosTerceros`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiListResponse<BancosTercerosResponse[]>> {
     return this.http.get<ApiListResponse<BancosTercerosResponse[]>>(this.baseUrl);
   }
 
   getById(id: number): Observable<ApiResponse<BancosTercerosResponse>> {
     return this.http.get<ApiResponse<BancosTercerosResponse>>(`${this.baseUrl}/${id}`);
   }
 
   create(data: BancosTercerosRequest): Observable<ApiResponse<any>> {
     return this.http.post<ApiResponse<any>>(this.baseUrl, data);
   }
 
   update(id: number, data: BancosTercerosRequest): Observable<ApiResponse<any>> {
     return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
   }
 
   delete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
   }
 
   softDelete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
   }
}
