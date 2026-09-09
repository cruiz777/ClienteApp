import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RpBancosResponse } from 'src/app/interfaces/responses/bancos-rol-response';
import { CreateRpBancosRequest } from 'src/app/interfaces/requests/bancos-rol-request';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class RpBancosService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/RpBancos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpBancosResponse[]>> {
    return this.http.get<ApiResponse<RpBancosResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpBancosResponse>> {
    return this.http.get<ApiResponse<RpBancosResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRpBancosRequest): Observable<ApiResponse<RpBancosResponse>> {
    return this.http.post<ApiResponse<RpBancosResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateRpBancosRequest): Observable<ApiResponse<RpBancosResponse>> {
    return this.http.put<ApiResponse<RpBancosResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}