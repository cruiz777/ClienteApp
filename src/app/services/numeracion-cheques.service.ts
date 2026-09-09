import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { map } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { NumeroChequesResponse } from '../interfaces/responses/numero-cheques-response';
import { NumeroChequesRequest } from '../interfaces/requests/numero-cheques-request';



@Injectable({ providedIn: 'root' })

export class NumeroChequesService {
  //private readonly baseUrl = environment.maintenanceUrl ?? '/TipoRetencion';      // e.g. 'http://localhost:5010'
  private readonly baseUrl = `${environment.maintenanceUrl}/NumeroCheques`;
  constructor(private http: HttpClient) {}

  //getAll(): Observable<ApiListResponse<NumeroChequesResponse[]>> {
  //   return this.http.get<ApiListResponse<NumeroChequesResponse[]>>(this.baseUrl);
  // }
 
  
  // Nuevo: admite filtros
    getAll(opts?: { idEmpresa?: number; estado?: string })
      : Observable<ApiListResponse<NumeroChequesResponse[]>> {

      let params = new HttpParams();
      if (opts?.idEmpresa != null) params = params.set('idEmpresa', String(opts.idEmpresa));
      if (opts?.estado)          params = params.set('estado', opts.estado);

      return this.http.get<ApiListResponse<NumeroChequesResponse[]>>(this.baseUrl, { params });
    }
    

   getById(id: number): Observable<ApiResponse<NumeroChequesResponse>> {
     return this.http.get<ApiResponse<NumeroChequesResponse>>(`${this.baseUrl}/${id}`);
   }
 
   create(data: NumeroChequesRequest): Observable<ApiResponse<any>> {
     return this.http.post<ApiResponse<any>>(this.baseUrl, data);
   }
 
   update(id: number, data: NumeroChequesRequest): Observable<ApiResponse<any>> {
     return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
   }
 
   delete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
   }
 
   softDelete(id: number): Observable<ApiResponse<any>> {
     return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
   }


   
}
