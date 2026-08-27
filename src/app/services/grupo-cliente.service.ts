import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GrupoClienteListResponse, GrupoClienteResponse } from '../interfaces/responses/grupo-cliente-response';
import { environment } from 'src/environments/environment';
import { GrupoClienteRequest } from '../interfaces/requests/grupo-cliente-request';
import { ApiResponse } from '../interfaces/responses/api-response'; // Asegúrate de tener esto

@Injectable({ providedIn: 'root' })
export class GrupoClienteService {
  private readonly apiUrl = `${environment.clientsUrl}/GrupoEmpresa`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<GrupoClienteListResponse> {
    return this.http.get<GrupoClienteListResponse>(this.apiUrl);
  }

  getById(id: number): Observable<GrupoClienteResponse> {
    return this.http.get<GrupoClienteResponse>(`${this.apiUrl}/${id}`);
  }

  create(data: GrupoClienteRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(id: number, data: GrupoClienteRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
