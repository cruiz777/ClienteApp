import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

import { ApiResponse } from './producto.service'; // O usa tu propia definición
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { LocalesResponse } from '../interfaces/responses/local-response';
import { LocalesRequest } from '../interfaces/requests/local-request';

@Injectable({
  providedIn: 'root'
})
export class LocalesService {
  private apiUrl = `${environment.securityApiUrl}/Locales`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiListResponse<LocalesResponse[]>> {
    return this.http.get<ApiListResponse<LocalesResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<LocalesResponse>> {
    return this.http.get<ApiResponse<LocalesResponse>>(`${this.apiUrl}/${id}`);
  }

  create(data: LocalesRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.apiUrl, data);
  }

  update(id: number, data: LocalesRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  softDelete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/soft-delete/${id}`);
  }
}
