import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { TipoNominaEspResponse } from 'src/app/interfaces/responses/tipo-nomina-esp-response';
import { CreateTipoNominaEspRequest } from 'src/app/interfaces/requests/tipo-nomina-esp-request';


@Injectable({
  providedIn: 'root'
})
export class TipoNominaEspService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/TipoNominaEsp`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<TipoNominaEspResponse[]>> {
    return this.http.get<ApiResponse<TipoNominaEspResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<TipoNominaEspResponse>> {
    return this.http.get<ApiResponse<TipoNominaEspResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTipoNominaEspRequest): Observable<ApiResponse<TipoNominaEspResponse>> {
    return this.http.post<ApiResponse<TipoNominaEspResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateTipoNominaEspRequest): Observable<ApiResponse<TipoNominaEspResponse>> {
    return this.http.put<ApiResponse<TipoNominaEspResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}