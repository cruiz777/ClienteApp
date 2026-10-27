import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UbicacionNivelRequest } from '../interfaces/requests/ubicacion-nivel-request';
import { ApiResponse } from '../interfaces/responses/api-response';
import { UbicacionNivelResponse } from '../interfaces/responses/ubicacion-nivel-response';

@Injectable({
  providedIn: 'root'
})
export class UbicacionNivelService {
  private apiUrl = `${environment.inventoryUrl}/UbicacionNivel`;

  constructor(private http: HttpClient) {}

  create(request: UbicacionNivelRequest): Observable<ApiResponse<UbicacionNivelResponse>> {
    return this.http.post<ApiResponse<UbicacionNivelResponse>>(this.apiUrl, request);
  }

  update(id: number, request: UbicacionNivelRequest): Observable<ApiResponse<UbicacionNivelResponse>> {
    return this.http.put<ApiResponse<UbicacionNivelResponse>>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  getAll(estado?: boolean): Observable<ApiResponse<UbicacionNivelResponse[]>> {
    let params = new HttpParams();
    if (estado !== undefined && estado !== null) {
      params = params.set('estado', estado.toString());
    }
    return this.http.get<ApiResponse<UbicacionNivelResponse[]>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<UbicacionNivelResponse>> {
    return this.http.get<ApiResponse<UbicacionNivelResponse>>(`${this.apiUrl}/${id}`);
  }

  getByCodigo(codigo: string): Observable<ApiResponse<UbicacionNivelResponse>> {
    return this.http.get<ApiResponse<UbicacionNivelResponse>>(`${this.apiUrl}/codigo/${codigo}`);
  }
}
