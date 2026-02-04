import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';

import { UpdateClienteRequest, UpdateClientesMasivoRequest } from '../interfaces/requests/update-cliente-request';
import { ClienteLicenseResponse } from '../interfaces/responses/cliente-license-response';
import { ExportLicenseQuery, ExportLicenseResponse } from '../interfaces/responses/export-licenses-response';
import { ExportProductosQuery, ProductoLicenseQuery } from '../interfaces/responses/export-products-response';
import { ExportProductoResponse, ExportProductosResponse, ProductoDisplay, ProductoLicenseResponse } from '../interfaces/responses/products-license-response';
import { SendToApiRequest } from '../interfaces/requests/enviar-api-verified-request';
import { ProductoDetalleResponse } from '../interfaces/responses/producto-detalle-response';
import { ClienteValidadoDTO, ClienteValidadoResultadoDTO } from '../interfaces/requests/cliente-validado';
import { ClienteBasicoResponse } from '../interfaces/responses/cliente-validar-response';
import { BatchUpdateResult } from '../interfaces/requests/batch-update-result';

export interface ClienteLicenseQuery {
  nombreCliente?: string;
  codigoPrefijo?: string;
  fechaDesde?: string; // YYYY-MM-DD
  fechaHasta?: string; // YYYY-MM-DD
  fechaIgual?: string; // YYYY-MM-DD
  ruc?: string;
  estadoPrefijo?: boolean;
  estadoEmpresa?: number;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ValidacionService {
  private baseUrl = environment.validationUrl;

  constructor(private http: HttpClient) {}

  // ✅ Validación Masiva
  validarMasivo(clienteIds: number[]): Observable<ApiResponse<ClienteValidadoResultadoDTO[]>> {
    return this.http.post<ApiResponse<ClienteValidadoResultadoDTO[]>>(
      `${this.baseUrl}/ClientesLicenses/validar-masivo`,
      clienteIds
    );
  }

  // ✅ Validación Unitaria
  validarUno(clienteId: number): Observable<ApiResponse<ClienteValidadoDTO>> {
    return this.http.post<ApiResponse<ClienteValidadoDTO>>(
      `${this.baseUrl}/ClientesLicenses/validar`,
      clienteId,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  updateCliente(idCliente: number, request: UpdateClienteRequest): Observable<ApiListResponse<boolean>> {
    return this.http.put<ApiListResponse<boolean>>(
      `${this.baseUrl}/ClientesLicenses/validacion/${idCliente}`,
      request
    );
  }

  updateClientesMasivo(request: UpdateClientesMasivoRequest): Observable<ApiResponse<BatchUpdateResult>> {
    return this.http.put<ApiResponse<BatchUpdateResult>>(
      `${this.baseUrl}/ClientesLicenses/batch`,
      request
    );
  }

  getClientesBasicos(
    page: number = 1,
    pageSize: number = 10,
    letraInicial?: string,
    zona?: string,
    textoBusqueda?: string
  ): Observable<ApiResponse<PaginationResponse<ClienteBasicoResponse>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (letraInicial && letraInicial.trim()) params = params.set('letraInicial', letraInicial.trim());
    if (zona && zona.trim()) params = params.set('zona', zona.trim());
    if (textoBusqueda && textoBusqueda.trim()) params = params.set('textoBusqueda', textoBusqueda.trim());

    return this.http.get<ApiResponse<PaginationResponse<ClienteBasicoResponse>>>(
      `${this.baseUrl}/ClientesLicenses/basicos`,
      { params }
    );
  }

  getClientesIdsFiltrados(
    letraInicial?: string,
    zona?: string,
    textoBusqueda?: string
  ): Observable<ApiResponse<number[]>> {
    let params = new HttpParams();
    if (letraInicial && letraInicial.trim()) params = params.set('letraInicial', letraInicial.trim());
    if (zona && zona.trim()) params = params.set('zona', zona.trim());
    if (textoBusqueda && textoBusqueda.trim()) params = params.set('textoBusqueda', textoBusqueda.trim());

    return this.http.get<ApiResponse<number[]>>(
      `${this.baseUrl}/ClientesLicenses/basicos/ids`,
      { params }
    );
  }

  getClientesLicense(query?: ClienteLicenseQuery): Observable<ApiResponse<PaginationResponse<ClienteLicenseResponse>>> {
    let params = new HttpParams();

    if (query) {
      if (query.nombreCliente) params = params.set('nombreCliente', query.nombreCliente);
      if (query.codigoPrefijo) params = params.set('codigoPrefijo', query.codigoPrefijo);
      if (query.fechaDesde) params = params.set('fechaDesde', query.fechaDesde);
      if (query.fechaHasta) params = params.set('fechaHasta', query.fechaHasta);
      if (query.fechaIgual) params = params.set('fechaIgual', query.fechaIgual);
      if (query.ruc) params = params.set('ruc', query.ruc);

      if (query.estadoPrefijo !== undefined) params = params.set('estadoPrefijo', query.estadoPrefijo.toString());
      if (query.estadoEmpresa !== undefined) params = params.set('estadoEmpresa', query.estadoEmpresa.toString());

      if (query.pageNumber) params = params.set('pageNumber', query.pageNumber.toString());
      if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    }

    return this.http.get<ApiResponse<PaginationResponse<ClienteLicenseResponse>>>(
      `${this.baseUrl}/ClientesLicenses/licenses`,
      { params }
    );
  }

  exportClientesLicense(query?: ExportLicenseQuery): Observable<ApiResponse<ExportLicenseResponse>> {
    let params = new HttpParams();

    if (query) {
      if (query.nombreCliente) params = params.set('nombreCliente', query.nombreCliente);
      if (query.codigoPrefijo) params = params.set('codigoPrefijo', query.codigoPrefijo);
      if (query.fechaDesde) params = params.set('fechaDesde', query.fechaDesde);
      if (query.fechaHasta) params = params.set('fechaHasta', query.fechaHasta);
      if (query.fechaIgual) params = params.set('fechaIgual', query.fechaIgual);
      if (query.ruc) params = params.set('ruc', query.ruc);

      if (query.estadoPrefijo !== undefined) params = params.set('estadoPrefijo', query.estadoPrefijo.toString());
      if (query.estadoEmpresa !== undefined) params = params.set('estadoEmpresa', query.estadoEmpresa.toString());

      if (query.batchSize) params = params.set('batchSize', query.batchSize.toString());
    }

    return this.http.get<ApiResponse<ExportLicenseResponse>>(
      `${this.baseUrl}/ClientesLicenses/licenses/export`,
      { params }
    );
  }

  // ======================================================
  // ✅ Envío genérico a tu backend (que a su vez envía a VERIFIED)
  // ======================================================
  sendProductosToApi(request: SendToApiRequest): Observable<{
    success: boolean;
    message: string;
    processedCount?: number;
    errors?: string[];
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      processedCount?: number;
      errors?: string[];
      error?: string;
    }>(`${this.baseUrl}/send-to-api`, request);
  }

  // ✅ Envío de licencias de CLIENTES (ya corregidas en el componente)
  sendLicenciasToApi(licencias: any[]): Observable<{
    success: boolean;
    message: string;
    processedCount?: number;
    errors?: string[];
    error?: string;
  }> {
    const request: SendToApiRequest = {
      apiType: 'licenses', // <-- deja aquí el valor exacto que tu backend espera
      products: licencias
    };
    return this.sendProductosToApi(request);
  }

  // ======================================================
  // PRODUCTOS (los dejo como estaban)
  // ======================================================
  getProductosLicense(query?: ProductoLicenseQuery): Observable<ApiResponse<PaginationResponse<ProductoLicenseResponse>>> {
    let params = new HttpParams();

    if (query) {
      if (query.nombreCliente) params = params.set('nombreCliente', query.nombreCliente);
      if (query.codigoPrefijo) params = params.set('codigoPrefijo', query.codigoPrefijo);
      if (query.ruc) params = params.set('ruc', query.ruc);

      if (query.fechaDesde) params = params.set('fechaDesde', query.fechaDesde);
      if (query.fechaHasta) params = params.set('fechaHasta', query.fechaHasta);
      if (query.fechaIgual) params = params.set('fechaIgual', query.fechaIgual);
      if (query.operadorFecha !== undefined) params = params.set('operadorFecha', query.operadorFecha.toString());

      if (query.estadoPrefijo !== undefined) params = params.set('estadoPrefijo', query.estadoPrefijo.toString());
      if (query.estadoEmpresa !== undefined) params = params.set('estadoEmpresa', query.estadoEmpresa.toString());
      if (query.estadoGtin !== undefined) params = params.set('estadoGtin', query.estadoGtin.toString());

      if (query.idUsuario !== undefined) params = params.set('idUsuario', query.idUsuario.toString());
      if (query.pageNumber !== undefined) params = params.set('pageNumber', query.pageNumber.toString());
      if (query.pageSize !== undefined) params = params.set('pageSize', query.pageSize.toString());
    }

    return this.http.get<ApiResponse<PaginationResponse<ProductoLicenseResponse>>>(
      `${this.baseUrl}/ProductosLicenses/licenses`,
      { params }
    );
  }

  exportProductosLicense(query?: ExportProductosQuery): Observable<ApiResponse<ExportProductosResponse>> {
    let params = new HttpParams();

    if (query) {
      if (query.nombreCliente) params = params.set('nombreCliente', query.nombreCliente);
      if (query.codigoPrefijo) params = params.set('codigoPrefijo', query.codigoPrefijo);
      if (query.ruc) params = params.set('ruc', query.ruc);

      if (query.fechaDesde) params = params.set('fechaDesde', query.fechaDesde);
      if (query.fechaHasta) params = params.set('fechaHasta', query.fechaHasta);
      if (query.fechaIgual) params = params.set('fechaIgual', query.fechaIgual);
      if (query.operadorFecha !== undefined) params = params.set('operadorFecha', query.operadorFecha.toString());

      if (query.estadoPrefijo !== undefined) params = params.set('estadoPrefijo', query.estadoPrefijo.toString());
      if (query.estadoEmpresa !== undefined) params = params.set('estadoEmpresa', query.estadoEmpresa.toString());
      if (query.estadoGtin !== undefined) params = params.set('estadoGtin', query.estadoGtin.toString());

      if (query.idUsuario !== undefined) params = params.set('idUsuario', query.idUsuario.toString());
      if (query.batchSize !== undefined) params = params.set('batchSize', query.batchSize.toString());
    }

    return this.http.get<ApiResponse<ExportProductosResponse>>(
      `${this.baseUrl}/ProductosLicenses/licenses/export`,
      { params }
    );
  }

  mapProductoLicenseToDisplay(producto: ProductoLicenseResponse): ProductoDisplay {
    return {
      id: producto.producto_id,
      gtin: producto.gtin,
      gtinStatus: producto.gtin_status,
      licenceKey: producto.licence_key,
      licenceType: producto.licence_type,
      brandName: producto.brand_name,
      productDescription: producto.product_description,
      productImageUrl: producto.product_image_url,
      netContentValue: producto.net_content_value,
      netContentUnitCode: producto.net_content_unit_code,
      nombreCliente: producto.nombre_cliente,
      codigoPrefijo: producto.codigo_prefijo,
      fechaCreacion: producto.fecha_creacion
    };
  }

  getProductoDetalle(gtin: string): Observable<ApiResponse<ProductoDetalleResponse>> {
    const params = new HttpParams().set('gtin', gtin);

    return this.http.get<ApiResponse<ProductoDetalleResponse>>(
      `${this.baseUrl}/ProductosLicenses/detalle`,
      { params }
    );
  }

  isValidGtin(gtin: string): boolean {
    if (!gtin) return false;
    if (gtin.length !== 13) return false;
    return /^\d+$/.test(gtin);
  }

  formatWebsiteUrl(website: string | undefined): string {
    if (!website || website === 'N/A' || website.trim() === '') return '';
    return website.startsWith('http') ? website : `https://${website}`;
  }
}
