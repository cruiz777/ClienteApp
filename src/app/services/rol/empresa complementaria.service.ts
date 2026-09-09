import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { RpEmpresaComplementariaResponse } from 'src/app/interfaces/responses/empresa-complementaria-response';
import { CreateRpEmpresaComplementariaRequest } from 'src/app/interfaces/requests/empresa-complementaria.request';

@Injectable({
  providedIn: 'root'
})
export class RpEmpresaComplementariaService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/RpEmpresaComplementaria`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpEmpresaComplementariaResponse[]>> {
    return this.http.get<ApiResponse<RpEmpresaComplementariaResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpEmpresaComplementariaResponse>> {
    return this.http.get<ApiResponse<RpEmpresaComplementariaResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRpEmpresaComplementariaRequest): Observable<ApiResponse<RpEmpresaComplementariaResponse>> {
    return this.http.post<ApiResponse<RpEmpresaComplementariaResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateRpEmpresaComplementariaRequest): Observable<ApiResponse<RpEmpresaComplementariaResponse>> {
    return this.http.put<ApiResponse<RpEmpresaComplementariaResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}