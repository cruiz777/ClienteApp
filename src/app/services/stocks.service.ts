import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface StockUpdateRequest {
  idlocal: number;
  stockmin: number | null;
  stockmax: number | null;
  cantidad: number;
}

export interface UpdateStocksRequest {
  stocks: StockUpdateRequest[];
}

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class StocksService {
  private apiUrl = `${environment.inventoryUrl}/Stocks`;

  constructor(private http: HttpClient) { }

  /**
   * Actualiza los stocks de un producto
   */
  actualizarStocks(idProducto: number, stocks: StockUpdateRequest[]): Observable<ApiResponse<boolean>> {
    const request: UpdateStocksRequest = { stocks };
    
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/producto/${idProducto}`,
      request
    );
  }
}