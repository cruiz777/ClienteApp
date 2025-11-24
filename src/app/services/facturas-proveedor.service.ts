import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  AsientoContableResponse,
} from 'src/app/interfaces/responses/asiento-contable-response';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class FacturasProveedorService {
  // 🔹 AJUSTA ESTA URL SEGÚN TU API
  //private baseUrl = '/api/AsientosContables'; ///facturas-proveedor
  private readonly baseUrl = `${environment.transactionUrl}/AsientosContables`;

  constructor(private http: HttpClient) {}

  getById(id: number): Observable<AsientoContableResponse> {
    return this.http.get<AsientoContableResponse>(`${this.baseUrl}/${id}`);
  }

  crear(
    request: AsientoContableResponse
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.baseUrl, request);
  }

  actualizar(
    id: number,
    request: AsientoContableResponse
  ): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, request);
  }
}
