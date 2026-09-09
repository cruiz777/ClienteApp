import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TipoLocalizacionResponse } from '../interfaces/responses/tipo-localizacion-response';
import { TipoLocalizacionRequest } from '../interfaces/requests/tipo-localizacion-request';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class TipoLocalizacionService {
  private apiUrl = `${environment.clientsUrl}/TipoLocalizacion`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<{ data: TipoLocalizacionResponse[] }> {
    return this.http.get<{ data: TipoLocalizacionResponse[] }>(`${this.apiUrl}`);
  }

  getById(id: number): Observable<{ data: TipoLocalizacionResponse }> {
    return this.http.get<{ data: TipoLocalizacionResponse }>(`${this.apiUrl}/${id}`);
  }

  create(data: TipoLocalizacionRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(id: number, data: TipoLocalizacionRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
