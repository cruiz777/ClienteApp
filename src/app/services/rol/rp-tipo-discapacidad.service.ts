import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id?: string;
  type: string;
  data: T;
  message?: string;
  count?: number;
}

export interface RpTipoDiscapacidadResponse {
  idTipoDiscapacidad: number;
  descripcion: string | null;
}

export interface RpTipoDiscapacidadRequest {
  descripcion: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RpTipoDiscapacidadService {

  private readonly apiUrl = `${environment.maintenanceRolUrl}/RpTipoDiscapacidad`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpTipoDiscapacidadResponse[]>> {
    return this.http.get<ApiResponse<RpTipoDiscapacidadResponse[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<RpTipoDiscapacidadResponse>> {
    return this.http.get<ApiResponse<RpTipoDiscapacidadResponse>>(
      `${this.apiUrl}/${id}`
    );
  }

  create(request: RpTipoDiscapacidadRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      this.apiUrl,
      request
    );
  }

  update(id: number, request: RpTipoDiscapacidadRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/${id}`,
      request
    );
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/${id}`
    );
  }
}