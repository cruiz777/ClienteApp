import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { TipoNegocioResponse } from '../interfaces/responses/tipo-negocio-response';
import { TipoNegocioRequest } from '../interfaces/requests/tipo-negocio-request';


@Injectable({
  providedIn: 'root'
})
export class TipoNegocioService {
  private apiUrl = `${environment.securityApiUrl}/TipoNegocio`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiListResponse<TipoNegocioResponse[]>> {
    return this.http.get<ApiListResponse<TipoNegocioResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<TipoNegocioResponse>> {
    return this.http.get<ApiResponse<TipoNegocioResponse>>(`${this.apiUrl}/${id}`);
  }

  create(data: TipoNegocioRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, data);
  }

  update(id: number, data: TipoNegocioRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  softDelete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/soft-delete/${id}`);
  }
}
