import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { SustentoTributarioRequest } from '../interfaces/requests/sustento-tributario-request';
import { SustentoTributarioResponse } from '../interfaces/responses/sustento-tributario-response';


@Injectable({ providedIn: 'root' })

export class SustentoTributarioService {
  //private readonly baseUrl = environment.maintenanceUrl ?? '/TipoRetencion';      // e.g. 'http://localhost:5010'
  private readonly baseUrl = `${environment.maintenanceUrl}/SustentoTributario`;
  constructor(private http: HttpClient) {}


  getAll(): Observable<ApiListResponse<SustentoTributarioResponse[]>> {
     return this.http.get<ApiListResponse<SustentoTributarioResponse[]>>(this.baseUrl);
   }

  
   getById(id: number): Observable<ApiResponse<SustentoTributarioResponse>> {
     return this.http.get<ApiResponse<SustentoTributarioResponse>>(`${this.baseUrl}/${id}`);
   }

  /*
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
  */
}
