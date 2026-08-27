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
import { BodegaConStockResponse } from '../interfaces/responses/bodega-con-stock-response';

export interface ApiResponse<T = any> {
  id?: string;
  type?: string;
  data?: T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private apiUrl = `${environment.inventoryUrl}/Producto`;

  constructor(private http: HttpClient) { }

  /** POST /api/Producto/GetByEstructuraComercial */
  getByEstructura(request: ProductoEstructuraComercialRequest): Observable<ApiResponse<ProductoResponse[]>> {
    return this.http.post<ApiResponse<ProductoResponse[]>>(`${this.apiUrl}/GetByEstructuraComercial`, request);
  }

  /** POST /api/Producto */
  create(request: ProductoRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, sanitizeProductoPayload(request));
  }

  /** POST /api/Producto/CreatePE */
  /** POST /api/Producto/CreatePE */
  createConEstructura(req: CreateProductoConEstructuraRequest): Observable<ApiResponse<any>> {
    const payload: CreateProductoConEstructuraRequest = {
      Producto: sanitizeProductoPayload(req.Producto as ProductoRequest), // 👈 Mayúscula
      Estructura: req.Estructura,
      Stocks: req.Stocks
    };
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/CreatePE`, payload);
  }

  getById(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  getSiguienteId(): Observable<ApiResponse<{ siguienteId: number }>> {
    return this.http.get<ApiResponse<{ siguienteId: number }>>(
      `${this.apiUrl}/siguiente-id`
    );
  }
  buscarProductosGlobal(termino: string, page: number = 1, pageSize: number = 20): Observable<any> {
    const url = `${this.apiUrl}/buscar-global?termino=${encodeURIComponent(termino)}&page=${page}&pageSize=${pageSize}`;
    return this.http.get<any>(url);
  }
  update(id: number, request: any): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/${id}`,
      request
    );
  }

  getPrimerProducto(): Observable<any> {
    const url = `${this.apiUrl}/primer-producto`;
    return this.http.get<any>(url);
  }
  
  getProductosPorEstructura(
    idDivision?: number | null,
    idSubDivision?: number | null,
    idDepartamento?: number | null,
    idSeccion?: number | null,
    idGrupo?: number | null
  ): Observable<ApiResponse<ProductoResponse[]>> {
    let params: any = {};
    
    if (idDivision) params.idDivision = idDivision.toString();
    if (idSubDivision) params.idSubDivision = idSubDivision.toString();
    if (idDepartamento) params.idDepartamento = idDepartamento.toString();
    if (idSeccion) params.idSeccion = idSeccion.toString();
    if (idGrupo) params.idGrupo = idGrupo.toString();

    return this.http.get<ApiResponse<ProductoResponse[]>>(
      `${environment.inventoryUrl}/Producto/por-estructura`,
      { params }
    );
  }
    /**
     * Obtiene todas las bodegas de un producto con información de stocks
     * @param idProducto - ID del producto
     */
    getBodegasByProducto(idProducto: number): Observable<ApiResponse<BodegaConStockResponse[]>> {
      return this.http.get<ApiResponse<BodegaConStockResponse[]>>(
        `${this.apiUrl}/bodega-stock/${idProducto}`
      );
    }
  validarCodigoBarras(codigoBarras: string): Observable<any> {
    const url = `${this.apiUrl}/validar-codigo-barras?codigoBarras=${encodeURIComponent(codigoBarras)}`;
    return this.http.get<any>(url);
  }
  getEstructuraByProducto(idProducto: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/estructura/${idProducto}`
    );
  }
}
