// src/app/services/producto-proveedor.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ProductoProveedorRequest } from '../interfaces/requests/producto-proveedor-request';
import { ProductoProveedorResponse } from '../interfaces/responses/producto-proveedor-response';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class ProductoProveedorService {
  private apiUrl = `${environment.inventoryUrl}/ProductoProveedor`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los proveedores de un producto
   */
  getProveedoresByProducto(idProducto: number): Observable<ApiResponse<ProductoProveedorResponse[]>> {
    return this.http.get<ApiResponse<ProductoProveedorResponse[]>>(`${this.apiUrl}/producto/${idProducto}`);
  }

  /**
   * Obtiene todos los productos de un proveedor
   */
  getProductosByProveedor(idProveedor: number): Observable<ApiResponse<ProductoProveedorResponse[]>> {
    return this.http.get<ApiResponse<ProductoProveedorResponse[]>>(`${this.apiUrl}/proveedor/${idProveedor}`);
  }

  /**
   * Crea una nueva relación producto-proveedor
   */
  create(relacion: ProductoProveedorRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.apiUrl, relacion);
  }

  /**
   * Actualiza una relación producto-proveedor
   */
  update(id: number, relacion: ProductoProveedorRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, relacion);
  }

  /**
   * Elimina una relación producto-proveedor (borrado físico)
   */
  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }
}