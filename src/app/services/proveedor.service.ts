// src/app/core/services/proveedor.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { ProveedorResponse } from '../interfaces/responses/proveedor-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { ProveedorRequest } from '../interfaces/requests/proveedor-request';

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.inventoryUrl}/proveedor`;

  /**
   * Obtiene todos los proveedores con paginación
   */
    getAll(
    page: number = 1,
    pageSize: number = 10,
    searchTerm?: string,
    orderBy?: string,
    isDescending: boolean = false,
    idTipoProveedor?: number  // ← AGREGAR ESTA LÍNEA
    ): Observable<PaginationResponse<ProveedorResponse>> {
    let params = new HttpParams()
        .set('page', page.toString())
        .set('pageSize', pageSize.toString())
        .set('isDescending', isDescending.toString());

    if (searchTerm) {
        params = params.set('searchTerm', searchTerm);
    }

    if (orderBy) {
        params = params.set('orderBy', orderBy);
    }

    if (idTipoProveedor) {  // ← AGREGAR ESTE BLOQUE
        params = params.set('idTipoProveedor', idTipoProveedor.toString());
    }

    return this.http.get<PaginationResponse<ProveedorResponse>>(this.apiUrl, { params });
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

  /**
   * Obtiene todos los productos de un proveedor
   */
  getProductosByProveedor(id: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/${id}/productos`);
  }
}