import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RpCargosResponse } from '../interfaces/responses/cargos-rol-response';
import { CreateRpCargosRequest } from '../interfaces/requests/cargos-rol';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class RpCargosService {

  private readonly baseUrl = `${environment.maintenanceRol}/RpCargos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpCargosResponse[]>> {
    return this.http.get<ApiResponse<RpCargosResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpCargosResponse>> {
    return this.http.get<ApiResponse<RpCargosResponse>>(`${this.baseUrl}/${id}`);
  }

  getByEmpresa(idEmpresa: number): Observable<ApiResponse<RpCargosResponse[]>> {
    return this.http.get<ApiResponse<RpCargosResponse[]>>(`${this.baseUrl}/empresa/${idEmpresa}`);
  }

  create(request: CreateRpCargosRequest): Observable<ApiResponse<RpCargosResponse>> {
    return this.http.post<ApiResponse<RpCargosResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateRpCargosRequest): Observable<ApiResponse<RpCargosResponse>> {
    return this.http.put<ApiResponse<RpCargosResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}