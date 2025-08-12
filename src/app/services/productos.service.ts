import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ProductoEstructuraComercialRequest } from '../interfaces/requests/producto-estructura-request';
import { ProductoResponse } from '../interfaces/responses/producto-response';

export interface ApiResponse<T> {
  id: string;
  type: string;     // "OK" | "ERROR" | ...
  data: T;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private apiUrl = `${environment.inventoryUrl}/Producto`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene productos por nivel de estructura comercial.
   * POST /api/Producto/GetByEstructuraComercial
   */
  getByEstructura(request: ProductoEstructuraComercialRequest): Observable<ApiResponse<ProductoResponse[]>> {
    return this.http.post<ApiResponse<ProductoResponse[]>>(`${this.apiUrl}/GetByEstructuraComercial`, request);
  }
}
