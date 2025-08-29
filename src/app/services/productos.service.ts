import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  CreateProductoConEstructuraRequest,
  ProductoEstructuraComercialRequest
} from '../interfaces/requests/create-producto-estructura-request';

import { ProductoRequest, sanitizeProductoPayload } from '../interfaces/requests/producto-request';
import { ProductoResponse } from '../interfaces/responses/producto-response';

export interface ApiResponse<T = any> {
  id?: string;
  type?: string;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private apiUrl = `${environment.inventoryUrl}/Producto`;

  constructor(private http: HttpClient) {}

  /** POST /api/Producto/GetByEstructuraComercial */
  getByEstructura(request: ProductoEstructuraComercialRequest): Observable<ApiResponse<ProductoResponse[]>> {
    return this.http.post<ApiResponse<ProductoResponse[]>>(`${this.apiUrl}/GetByEstructuraComercial`, request);
  }

  /** POST /api/Producto */
  create(request: ProductoRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, sanitizeProductoPayload(request));
  }

  /** POST /api/Producto/CreatePE */
  createConEstructura(req: CreateProductoConEstructuraRequest): Observable<ApiResponse<any>> {
    const payload: CreateProductoConEstructuraRequest = {
      ...req,
      Producto: sanitizeProductoPayload(req.Producto as ProductoRequest)
    };
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/CreatePE`, payload);
  }
}
