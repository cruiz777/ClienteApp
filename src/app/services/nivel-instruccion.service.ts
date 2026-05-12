import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { ApiResponse } from '../interfaces/responses/api-response';
import { RpNivelInstruccionResponse } from '../interfaces/responses/nivel-instruccion.response';
import { CreateRpNivelInstruccionRequest, UpdateRpNivelInstruccionRequest } from '../interfaces/requests/nivel-instruccion-request';

@Injectable({
  providedIn: 'root'
})
export class RpNivelInstruccionService {

  private readonly baseUrl = `${environment.maintenanceRol}/RpNivelInstruccion`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpNivelInstruccionResponse[]>> {
    return this.http.get<ApiResponse<RpNivelInstruccionResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpNivelInstruccionResponse>> {
    return this.http.get<ApiResponse<RpNivelInstruccionResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRpNivelInstruccionRequest): Observable<ApiResponse<RpNivelInstruccionResponse>> {
    return this.http.post<ApiResponse<RpNivelInstruccionResponse>>(this.baseUrl, request);
  }

  update(id: number, request: UpdateRpNivelInstruccionRequest): Observable<ApiResponse<RpNivelInstruccionResponse>> {
    return this.http.put<ApiResponse<RpNivelInstruccionResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}