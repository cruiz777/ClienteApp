import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ProyectoResponse } from '../interfaces/responses/proyecto-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { ProyectoRequest } from '../interfaces/requests/proyecto-request';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {

  private readonly baseUrl = `${environment.securityApiUrl}/Proyectos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<ProyectoResponse[]>> {
    return this.http.get<ApiResponse<ProyectoResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<ProyectoResponse>> {
    return this.http.get<ApiResponse<ProyectoResponse>>(`${this.baseUrl}/${id}`);
  }

  create(project: ProyectoRequest): Observable<ApiResponse<ProyectoResponse>> {
    return this.http.post<ApiResponse<ProyectoResponse>>(this.baseUrl, project);
  }

  update(id: number, project: ProyectoRequest): Observable<ApiResponse<ProyectoResponse>> {
    return this.http.put<ApiResponse<ProyectoResponse>>(`${this.baseUrl}/${id}`, project);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}
