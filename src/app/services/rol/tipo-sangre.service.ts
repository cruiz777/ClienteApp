import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { RpTipoSangreResponse } from 'src/app/interfaces/responses/tipo-sangre-response';
import { CreateRpTipoSangreRequest } from 'src/app/interfaces/requests/tipo-sangre-request';

@Injectable({
  providedIn: 'root'
})
export class RpTipoSangreService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/RpTipoSangre`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpTipoSangreResponse[]>> {
    return this.http.get<ApiResponse<RpTipoSangreResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpTipoSangreResponse>> {
    return this.http.get<ApiResponse<RpTipoSangreResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRpTipoSangreRequest): Observable<ApiResponse<RpTipoSangreResponse>> {
    return this.http.post<ApiResponse<RpTipoSangreResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateRpTipoSangreRequest): Observable<ApiResponse<RpTipoSangreResponse>> {
    return this.http.put<ApiResponse<RpTipoSangreResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}