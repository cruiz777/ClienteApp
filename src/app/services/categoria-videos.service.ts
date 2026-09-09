import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from './producto.service'; // O usa tu propia definición
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { CategoriaVideosResponse } from '../interfaces/responses/categoria-videos-response';
import { CategoriaVideosRequest } from '../interfaces/requests/categoria-videos-request';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriaVideosService {
  private apiUrl = `${environment.securityApiUrl}/CategoriaVideos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiListResponse<CategoriaVideosResponse[]>> {
    return this.http.get<ApiListResponse<CategoriaVideosResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<CategoriaVideosResponse>> {
    return this.http.get<ApiResponse<CategoriaVideosResponse>>(`${this.apiUrl}/${id}`);
  }

  create(data: CategoriaVideosRequest): Observable<ApiResponse<CategoriaVideosResponse>> {
    return this.http.post<ApiResponse<CategoriaVideosResponse>>(this.apiUrl, data);
  }

  update(id: number, data: CategoriaVideosRequest): Observable<ApiResponse<CategoriaVideosResponse>> {
    return this.http.put<ApiResponse<CategoriaVideosResponse>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }
}
