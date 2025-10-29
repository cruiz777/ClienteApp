// src/app/services/proveedor.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ProveedorRequest } from '../interfaces/requests/proveedor-request';
import { ProveedorResponse } from '../interfaces/responses/proveedor-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private apiUrl = `${environment.inventoryUrl}/Proveedor`;

  constructor(private http: HttpClient) { }

/**
   * Obtiene todos los proveedores activos (paginados)
   */
  getAll(): Observable<PaginationResponse<ProveedorResponse>> { // ✅ CAMBIAR TIPO
    return this.http.get<PaginationResponse<ProveedorResponse>>(this.apiUrl);
  }

  /**
   * Obtiene un proveedor por ID
   */
  getById(id: number): Observable<ApiResponse<ProveedorResponse>> {
    return this.http.get<ApiResponse<ProveedorResponse>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo proveedor
   */
  create(proveedor: ProveedorRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.apiUrl, proveedor);
  }

  /**
   * Actualiza un proveedor existente
   */
  update(id: number, proveedor: ProveedorRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, proveedor);
  }

  /**
   * Elimina un proveedor (borrado lógico)
   */
  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }
}