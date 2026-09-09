import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { ProductoUbicacionBodegaRequest } from '../interfaces/requests/producto-ubicacion-bodega-request';
import { ProductoUbicacionBodegaResponse } from '../interfaces/responses/producto-ubicacion-bodega-response';


@Injectable({
  providedIn: 'root'
})
export class ProductoUbicacionBodegaService {
  private apiUrl = `${environment.inventoryUrl}/ProductoUbicacionBodega`;

  constructor(private http: HttpClient) {}

  create(request: ProductoUbicacionBodegaRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, request);
  }

  update(id: number, request: ProductoUbicacionBodegaRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  getAll(idProducto?: number, idLocal?: number): Observable<ApiResponse<ProductoUbicacionBodegaResponse[]>> {
    let params = new HttpParams();
    if (idProducto) {
      params = params.set('idProducto', idProducto.toString());
    }
    if (idLocal) {
      params = params.set('idLocal', idLocal.toString());
    }
    return this.http.get<ApiResponse<ProductoUbicacionBodegaResponse[]>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<ProductoUbicacionBodegaResponse>> {
    return this.http.get<ApiResponse<ProductoUbicacionBodegaResponse>>(`${this.apiUrl}/${id}`);
  }

  getByProductoId(idProducto: number): Observable<ApiResponse<ProductoUbicacionBodegaResponse[]>> {
    return this.http.get<ApiResponse<ProductoUbicacionBodegaResponse[]>>(`${this.apiUrl}/producto/${idProducto}`);
  }

  getByLocalId(idLocal: number): Observable<ApiResponse<ProductoUbicacionBodegaResponse[]>> {
    return this.http.get<ApiResponse<ProductoUbicacionBodegaResponse[]>>(`${this.apiUrl}/local/${idLocal}`);
  }
}