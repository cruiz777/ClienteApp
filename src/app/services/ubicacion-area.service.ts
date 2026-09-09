import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UbicacionAreaRequest } from '../interfaces/requests/ubicacion-area-request';
import { UbicacionAreaResponse } from '../interfaces/responses/ubicacion-area-response';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class UbicacionAreaService {
  private apiUrl = `${environment.inventoryUrl}/UbicacionArea`;

  constructor(private http: HttpClient) {}

  create(request: UbicacionAreaRequest): Observable<ApiResponse<UbicacionAreaResponse>> {
    return this.http.post<ApiResponse<UbicacionAreaResponse>>(this.apiUrl, request);
  }

  update(id: number, request: UbicacionAreaRequest): Observable<ApiResponse<UbicacionAreaResponse>> {
    return this.http.put<ApiResponse<UbicacionAreaResponse>>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  getAll(estado?: boolean): Observable<ApiResponse<UbicacionAreaResponse[]>> {
    let params = new HttpParams();
    if (estado !== undefined && estado !== null) {
      params = params.set('estado', estado.toString());
    }
    return this.http.get<ApiResponse<UbicacionAreaResponse[]>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<UbicacionAreaResponse>> {
    return this.http.get<ApiResponse<UbicacionAreaResponse>>(`${this.apiUrl}/${id}`);
  }

  getByCodigo(codigo: string): Observable<ApiResponse<UbicacionAreaResponse>> {
    return this.http.get<ApiResponse<UbicacionAreaResponse>>(`${this.apiUrl}/codigo/${codigo}`);
  }
}