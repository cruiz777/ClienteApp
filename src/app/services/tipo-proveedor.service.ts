// src/app/core/services/tipo-proveedor.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { TipoProveedorResponse } from '../interfaces/responses/tipo-proveedor-response';

@Injectable({
  providedIn: 'root'
})
export class TipoProveedorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.inventoryUrl}/tipoproveedor`;

  /**
   * Obtiene todos los tipos de proveedor
   */
  getAll(soloActivos: boolean = true): Observable<ApiResponse<TipoProveedorResponse[]>> {
    const params = new HttpParams().set('soloActivos', soloActivos.toString());
    return this.http.get<ApiResponse<TipoProveedorResponse[]>>(this.apiUrl, { params });
  }
}