import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { MovimientoBancarioResponse } from '../interfaces/responses/movimiento-bancario-response';
import { MovimientoBancarioRequest } from '../interfaces/requests/movimiento-bancario-request';

@Injectable({ providedIn: 'root' })

export class MovimientoBancarioService {
  //private readonly baseUrl = environment.maintenanceUrl ?? '/TipoRetencion';      // e.g. 'http://localhost:5010'
  private readonly baseUrl = `${environment.maintenanceUrl}/MovimientoBancario`;
  constructor(private http: HttpClient) {}


  getAll(): Observable<ApiListResponse<MovimientoBancarioResponse[]>> {
     return this.http.get<ApiListResponse<MovimientoBancarioResponse[]>>(this.baseUrl);
   }

  
   getById(id: number): Observable<ApiResponse<MovimientoBancarioResponse>> {
     return this.http.get<ApiResponse<MovimientoBancarioResponse>>(`${this.baseUrl}/${id}`);
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
