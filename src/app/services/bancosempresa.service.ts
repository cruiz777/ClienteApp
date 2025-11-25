import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { BancosEmpresaResponse } from '../interfaces/responses/bancos-empresa-response';
import { BancosEmpresaRequest } from '../interfaces/requests/bancos-empresa-request';

@Injectable({ providedIn: 'root' })

export class BancosEmpresaService {
  //private readonly baseUrl = environment.maintenanceUrl ?? '/TipoRetencion';      // e.g. 'http://localhost:5010'
  private readonly baseUrl = `${environment.maintenanceUrl}/BancosEmpresa`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiListResponse<BancosEmpresaResponse[]>> {
     return this.http.get<ApiListResponse<BancosEmpresaResponse[]>>(this.baseUrl);
   }
 
   getById(id: number): Observable<ApiResponse<BancosEmpresaResponse>> {
     return this.http.get<ApiResponse<BancosEmpresaResponse>>(`${this.baseUrl}/${id}`);
   }
 
   create(data: BancosEmpresaRequest): Observable<ApiResponse<any>> {
     return this.http.post<ApiResponse<any>>(this.baseUrl, data);
   }
 
   update(id: number, data: BancosEmpresaRequest): Observable<ApiResponse<any>> {
     return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
   }
 
   delete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
   }
 
   softDelete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
   }
}
