import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { CentroCostosResponse } from '../interfaces/responses/centro-costos-response';
import { CentroCostosRequest } from '../interfaces/requests/centro-costos-request';

@Injectable({
  providedIn: 'root'
})
export class CentroCostosService {
  private apiUrl = `${environment.securityApiUrl}/CentroCostos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiListResponse<CentroCostosResponse[]>> {
    return this.http.get<ApiListResponse<CentroCostosResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<CentroCostosResponse>> {
    return this.http.get<ApiResponse<CentroCostosResponse>>(`${this.apiUrl}/${id}`);
  }

  create(data: CentroCostosRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, data);
  }

  update(id: number, data: CentroCostosRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  softDelete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/soft-delete/${id}`);
  }
}
