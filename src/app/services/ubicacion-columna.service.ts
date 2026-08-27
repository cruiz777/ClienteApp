import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UbicacionColumnaRequest } from '../interfaces/requests/ubicacion-columna-request';
import { UbicacionColumnaResponse } from '../interfaces/responses/ubicacion-columna-response';
import { ApiResponse } from '../interfaces/responses/api-response';


@Injectable({
  providedIn: 'root'
})
export class UbicacionColumnaService {
  private apiUrl = `${environment.inventoryUrl}/UbicacionColumna`;

  constructor(private http: HttpClient) {}

  create(request: UbicacionColumnaRequest): Observable<ApiResponse<UbicacionColumnaResponse>> {
    return this.http.post<ApiResponse<UbicacionColumnaResponse>>(this.apiUrl, request);
  }

  update(id: number, request: UbicacionColumnaRequest): Observable<ApiResponse<UbicacionColumnaResponse>> {
    return this.http.put<ApiResponse<UbicacionColumnaResponse>>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  getAll(estado?: boolean): Observable<ApiResponse<UbicacionColumnaResponse[]>> {
    let params = new HttpParams();
    if (estado !== undefined && estado !== null) {
      params = params.set('estado', estado.toString());
    }
    return this.http.get<ApiResponse<UbicacionColumnaResponse[]>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<UbicacionColumnaResponse>> {
    return this.http.get<ApiResponse<UbicacionColumnaResponse>>(`${this.apiUrl}/${id}`);
  }

  getByCodigo(codigo: string): Observable<ApiResponse<UbicacionColumnaResponse>> {
    return this.http.get<ApiResponse<UbicacionColumnaResponse>>(`${this.apiUrl}/codigo/${codigo}`);
  }
}