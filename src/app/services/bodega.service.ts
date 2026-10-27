// src/app/services/bodega.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BodegaConStockResponse } from '../interfaces/responses/bodega-con-stock-response';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class BodegaService {
  private apiUrl = `${environment.invoicesUrl}/Bodega`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todas las bodegas de un producto con información de stocks
   * @param idProducto - ID del producto
   */
  getBodegasByProducto(idProducto: number): Observable<ApiResponse<BodegaConStockResponse[]>> {
    return this.http.get<ApiResponse<BodegaConStockResponse[]>>(
      `${this.apiUrl}/producto/${idProducto}/all`
    );
  }
}