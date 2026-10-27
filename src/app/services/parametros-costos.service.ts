import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ParametrosCostosResponse } from '../interfaces/responses/parametros-costos.response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { CreateParametrosCostosRequest } from '../interfaces/requests/parametros-costos-request';

@Injectable({
  providedIn: 'root'
})
export class ParametrosCostosService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/ParametrosCostos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<ParametrosCostosResponse[]>> {
    return this.http.get<ApiResponse<ParametrosCostosResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<ParametrosCostosResponse>> {
    return this.http.get<ApiResponse<ParametrosCostosResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateParametrosCostosRequest): Observable<ApiResponse<ParametrosCostosResponse>> {
    return this.http.post<ApiResponse<ParametrosCostosResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateParametrosCostosRequest): Observable<ApiResponse<ParametrosCostosResponse>> {
    return this.http.put<ApiResponse<ParametrosCostosResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}