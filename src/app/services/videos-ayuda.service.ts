import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse } from './producto.service'; // O usa tu propia definición
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { VideosAyudaResponse } from '../interfaces/responses/videos-ayuda-response';
import { VideosAyudaRequest } from '../interfaces/requests/videos-ayuda-request';

@Injectable({
  providedIn: 'root'
})
export class VideosAyudaService {
  private apiUrl = `${environment.securityApiUrl}/VideosAyuda`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiListResponse<VideosAyudaResponse[]>> {
    return this.http.get<ApiListResponse<VideosAyudaResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<VideosAyudaResponse>> {
    return this.http.get<ApiResponse<VideosAyudaResponse>>(`${this.apiUrl}/${id}`);
  }

  getBySistema(idSistema: number): Observable<ApiListResponse<VideosAyudaResponse[]>> {
    return this.http.get<ApiListResponse<VideosAyudaResponse[]>>(`${this.apiUrl}/sistema/${idSistema}`);
  }

  getActivosBySistema(idSistema: number): Observable<ApiListResponse<VideosAyudaResponse[]>> {
    return this.http.get<ApiListResponse<VideosAyudaResponse[]>>(`${this.apiUrl}/sistema/${idSistema}/activos`);
  }

  create(data: VideosAyudaRequest): Observable<ApiResponse<VideosAyudaResponse>> {
    return this.http.post<ApiResponse<VideosAyudaResponse>>(this.apiUrl, data);
  }

  update(id: number, data: VideosAyudaRequest): Observable<ApiResponse<VideosAyudaResponse>> {
    return this.http.put<ApiResponse<VideosAyudaResponse>>(`${this.apiUrl}/${id}`, data);
  }

  softDelete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}/soft`);
  }
}
