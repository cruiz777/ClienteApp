import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './api-response.interface';
import { DepartamentoRequest } from '../interfaces/requests/departamento-request';
import { DepartamentoResponse } from '../interfaces/responses/departamento-response';

@Injectable({
  providedIn: 'root'
})
export class DepartamentoService {
  private apiUrl = `${environment.applicationUrl}/departamento`;

  constructor(private http: HttpClient) { }

  getByFk(id: number): Observable<ApiResponse<DepartamentoResponse[]>> {
    return this.http.get<ApiResponse<DepartamentoResponse[]>>(`${this.apiUrl}/departamento/${id}`);
  }

  create(data: DepartamentoRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(data: DepartamentoRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.apiUrl, data);
  }
}
