import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { RpRegimenResponse } from 'src/app/interfaces/responses/regimen-response';
import { CreateRpRegimenRequest, UpdateRpRegimenRequest } from 'src/app/interfaces/requests/regimen-request';

@Injectable({
  providedIn: 'root'
})
export class RpRegimenService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/RpRegimen`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpRegimenResponse[]>> {
    return this.http.get<ApiResponse<RpRegimenResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpRegimenResponse>> {
    return this.http.get<ApiResponse<RpRegimenResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRpRegimenRequest): Observable<ApiResponse<RpRegimenResponse>> {
    return this.http.post<ApiResponse<RpRegimenResponse>>(this.baseUrl, request);
  }

  update(id: number, request: UpdateRpRegimenRequest): Observable<ApiResponse<RpRegimenResponse>> {
    return this.http.put<ApiResponse<RpRegimenResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}