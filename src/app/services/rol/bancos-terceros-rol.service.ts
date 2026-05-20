import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { RpBanTerceroResponse } from 'src/app/interfaces/responses/bancos-terceros-rol-response';
import { CreateRpBanTerceroRequest } from 'src/app/interfaces/requests/bancos-terceros-rol-request';


@Injectable({
  providedIn: 'root'
})
export class RpBanTerceroService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/RpBanTercero`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpBanTerceroResponse[]>> {
    return this.http.get<ApiResponse<RpBanTerceroResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpBanTerceroResponse>> {
    return this.http.get<ApiResponse<RpBanTerceroResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRpBanTerceroRequest): Observable<ApiResponse<RpBanTerceroResponse>> {
    return this.http.post<ApiResponse<RpBanTerceroResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateRpBanTerceroRequest): Observable<ApiResponse<RpBanTerceroResponse>> {
    return this.http.put<ApiResponse<RpBanTerceroResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}