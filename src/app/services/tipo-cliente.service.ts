import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoClienteRequest } from '../interfaces/requests/tipo-cliente-request';
import { TipoClienteListResponse, TipoClienteResponse } from '../interfaces/responses/tipo-cliente-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TipoClienteService {
  private apiUrl = `${environment.clientsUrl}/TipoCliente`;
  private resumenUrl = `${environment.clientsUrl}/listadotipocliente`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoClienteListResponse> {
    return this.http.get<TipoClienteListResponse>(this.apiUrl);
  }

  getResume(): Observable<TipoClienteListResponse> {
    return this.http.get<TipoClienteListResponse>(this.resumenUrl);
  }

  getById(id: number): Observable<{ data: TipoClienteResponse }> {
    return this.http.get<{ data: TipoClienteResponse }>(`${this.apiUrl}/${id}`);
  }

  create(data: TipoClienteRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(id: number, data: TipoClienteRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
