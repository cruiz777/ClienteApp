import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { SectorialResponse } from '../interfaces/responses/sectorial-response';
import { CreateSectorialRequest } from '../interfaces/requests/sectorial-request';

@Injectable({
  providedIn: 'root'
})
export class SectorialService {

  private readonly baseUrl = `${environment.maintenanceRol}/Sectorial`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<SectorialResponse[]>> {
    return this.http.get<ApiResponse<SectorialResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<SectorialResponse>> {
    return this.http.get<ApiResponse<SectorialResponse>>(`${this.baseUrl}/${id}`);
  }

  getByEmpresa(idEmpresa: number): Observable<ApiResponse<SectorialResponse[]>> {
    return this.http.get<ApiResponse<SectorialResponse[]>>(`${this.baseUrl}/empresa/${idEmpresa}`);
  }

  create(request: CreateSectorialRequest): Observable<ApiResponse<SectorialResponse>> {
    return this.http.post<ApiResponse<SectorialResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateSectorialRequest): Observable<ApiResponse<SectorialResponse>> {
    return this.http.put<ApiResponse<SectorialResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}