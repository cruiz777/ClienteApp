import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { TipoGastoResponse } from '../interfaces/responses/tipo-gasto-response';
import { CreateTipoGastoRequest } from '../interfaces/requests/tipo-gasto-resquest';

@Injectable({
  providedIn: 'root'
})
export class TipoGastoService {

  private readonly baseUrl = `${environment.maintenanceRol}/TipoGasto`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<TipoGastoResponse[]>> {
    return this.http.get<ApiResponse<TipoGastoResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<TipoGastoResponse>> {
    return this.http.get<ApiResponse<TipoGastoResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTipoGastoRequest): Observable<ApiResponse<TipoGastoResponse>> {
    return this.http.post<ApiResponse<TipoGastoResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateTipoGastoRequest): Observable<ApiResponse<TipoGastoResponse>> {
    return this.http.put<ApiResponse<TipoGastoResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}