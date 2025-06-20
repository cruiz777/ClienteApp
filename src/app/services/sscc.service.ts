import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { SsccResponse } from '../interfaces/responses/sscc-response';
import { SsccRequest } from '../interfaces/requests/sscc-request';
import { GenerateSsccRequest } from '../interfaces/requests/generate-sscc-request';

@Injectable({
  providedIn: 'root'
})
export class SsccService {
  private apiUrl = `${environment.clientsUrl}/Sscc`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<SsccResponse[]>> {
    return this.http.get<ApiResponse<SsccResponse[]>>(`${this.apiUrl}`);
  }

  getById(id: number): Observable<ApiResponse<SsccResponse>> {
    return this.http.get<ApiResponse<SsccResponse>>(`${this.apiUrl}/${id}`);
  }

  getByPrefijo(idPrefijo: number, page: number = 1, pageSize: number = 50): Observable<ApiResponse<PaginationResponse<SsccResponse>>> {
    const params = new HttpParams()
      .set('idPrefijo', idPrefijo.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginationResponse<SsccResponse>>>(`${this.apiUrl}/por-prefijo`, { params });
  }

  getByCliente(idCliente: number, page: number = 1, pageSize: number = 50): Observable<ApiResponse<PaginationResponse<SsccResponse>>> {
    const params = new HttpParams()
      .set('idCliente', idCliente.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginationResponse<SsccResponse>>>(`${this.apiUrl}/por-cliente`, { params });
  }

  create(request: SsccRequest): Observable<ApiResponse<SsccResponse>> {
    return this.http.post<ApiResponse<SsccResponse>>(`${this.apiUrl}`, request);
  }

  update(id: number, request: SsccRequest): Observable<ApiResponse<SsccResponse>> {
    return this.http.put<ApiResponse<SsccResponse>>(`${this.apiUrl}/${id}`, request);
  }

  generate(request: GenerateSsccRequest): Observable<ApiResponse<string[]>> {
    return this.http.post<ApiResponse<string[]>>(`${this.apiUrl}/generar`, request);
  }
}
