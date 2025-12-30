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
import { ExportProductoResponse, ExportProductosResponse, ProductoDisplay, ProductoLicenseResponse } from '../interfaces/responses/products-license-response';
import { ExportProductosQuery, ProductoLicenseQuery } from '../interfaces/responses/export-products-response';
import { SendToApiRequest } from '../interfaces/requests/enviar-api-verified-request';
import { ProductoDetalleResponse } from '../interfaces/responses/producto-detalle-response';
import { ClienteValidadoDTO, ClienteValidadoResultadoDTO } from '../interfaces/requests/cliente-validado';
import { ClienteBasicoResponse } from '../interfaces/responses/cliente-validar-response';
import { BatchUpdateResult } from '../interfaces/requests/batch-update-result';


export interface ClienteLicenseQuery {
  nombreCliente?: string;
  codigoPrefijo?: string;
  fechaDesde?: string; // formato YYYY-MM-DD
  fechaHasta?: string; // formato YYYY-MM-DD
  fechaIgual?: string; // formato YYYY-MM-DD
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
  private baseUrl = environment.validationUrl; // Ajusta la URL base

  constructor(private http: HttpClient) {}

  // ✅ Validación Masiva
    validarMasivo(clienteIds: number[]): Observable<ApiResponse<ClienteValidadoResultadoDTO[]>> {
      return this.http.post<ApiResponse<ClienteValidadoResultadoDTO[]>>(`${this.baseUrl}/ClientesLicenses/validar-masivo`, clienteIds);
    }

    // ✅ Validación Unitaria
    validarUno(clienteId: number): Observable<ApiResponse<ClienteValidadoDTO>> {
      return this.http.post<ApiResponse<ClienteValidadoDTO>>(
        `${this.baseUrl}/ClientesLicenses/validar`,
        clienteId, // ✅ pasar el número directamente
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  updateCliente(idCliente: number, request: UpdateClienteRequest): Observable<ApiListResponse<boolean>> {
    return this.http.put<ApiListResponse<boolean>>(`${this.baseUrl}/ClientesLicenses/validacion/${idCliente}`, request);
  }
  //ACTUALIZA MASIVAMENTE LOS REGISTROS EN VEZ DE 1 A 1
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

    // ✅ Agregar filtros si existen
    if (letraInicial && letraInicial.trim()) {
      params = params.set('letraInicial', letraInicial.trim());
    }
    if (zona && zona.trim()) {
      params = params.set('zona', zona.trim());
    }
    if (textoBusqueda && textoBusqueda.trim()) {
      params = params.set('textoBusqueda', textoBusqueda.trim());
    }

    return this.http.get<ApiResponse<PaginationResponse<ClienteBasicoResponse>>>(
      `${this.baseUrl}/ClientesLicenses/basicos`,
      { params }
    );
  }

  // NUEVO MÉTODO para obtener todos los IDs filtrados
  getClientesIdsFiltrados(
    letraInicial?: string,
    zona?: string,
    textoBusqueda?: string
  ): Observable<ApiResponse<number[]>> {
    let params = new HttpParams();

    if (letraInicial && letraInicial.trim()) {
      params = params.set('letraInicial', letraInicial.trim());
    }
    if (zona && zona.trim()) {
      params = params.set('zona', zona.trim());
    }
    if (textoBusqueda && textoBusqueda.trim()) {
      params = params.set('textoBusqueda', textoBusqueda.trim());
    }

    return this.http.get<ApiResponse<number[]>>(
      `${this.baseUrl}/ClientesLicenses/basicos/ids`,
      { params }
    );
  }
  /**
   * Obtiene las licencias de clientes con filtros opcionales
   * @param query Parámetros de búsqueda y filtros
   * @returns Observable con la respuesta paginada de licencias
   */
  getClientesLicense(query?: ClienteLicenseQuery): Observable<ApiResponse<PaginationResponse<ClienteLicenseResponse>>> {
    let params = new HttpParams();

    if (query) {
      // Agregar parámetros solo si tienen valor
      if (query.nombreCliente) {
        params = params.set('nombreCliente', query.nombreCliente);
      }
      if (query.codigoPrefijo) {
        params = params.set('codigoPrefijo', query.codigoPrefijo);
      }
      if (query.fechaDesde) {
        params = params.set('fechaDesde', query.fechaDesde);
      }
      if (query.fechaHasta) {
        params = params.set('fechaHasta', query.fechaHasta);
      }
      if (query.fechaIgual) {
        params = params.set('fechaIgual', query.fechaIgual);
      }
      if (query.ruc) {
        params = params.set('ruc', query.ruc);
      }
      if (query.estadoPrefijo !== undefined) {
        params = params.set('estadoPrefijo', query.estadoPrefijo.toString());
      }
      if (query.estadoEmpresa !== undefined) {
        params = params.set('estadoEmpresa', query.estadoEmpresa.toString());
      }
      if (query.pageNumber) {
        params = params.set('pageNumber', query.pageNumber.toString());
      }
      if (query.pageSize) {
        params = params.set('pageSize', query.pageSize.toString());
      }
    }

    return this.http.get<ApiResponse<PaginationResponse<ClienteLicenseResponse>>>(
      `${this.baseUrl}/ClientesLicenses/licenses`,
      { params }
    );
  }

  /**
   * Método helper para obtener licencias con parámetros individuales (alternativa más simple)
   */
  getClientesLicenseSimple(
    nombreCliente?: string,
    codigoPrefijo?: string,
    fechaDesde?: string,
    fechaHasta?: string,
    fechaIgual?: string,
    ruc?: string,
    estadoPrefijo?: boolean,
    estadoEmpresa?: number,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Observable<ApiResponse<PaginationResponse<ClienteLicenseResponse>>> {
    const query: ClienteLicenseQuery = {
      nombreCliente,
      codigoPrefijo,
      fechaDesde,
      fechaHasta,
      fechaIgual,
      ruc,
      estadoPrefijo,
      estadoEmpresa,
      pageNumber,
      pageSize
    };

    return this.getClientesLicense(query);
  }
  /**
   * Exporta licencias en formato específico reutilizando los mismos filtros
   */
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

  //PRODUCTOS
   /**
   * Obtiene las licencias de productos con filtros opcionales (para el grid/tabla)
   * Endpoint: GET /api/ProductosLicenses/licenses
   */
  getProductosLicense(query?: ProductoLicenseQuery): Observable<ApiResponse<PaginationResponse<ProductoLicenseResponse>>> {
    let params = new HttpParams();

    if (query) {
      // Filtros de texto
      if (query.nombreCliente) {
        params = params.set('nombreCliente', query.nombreCliente);
      }
      if (query.codigoPrefijo) {
        params = params.set('codigoPrefijo', query.codigoPrefijo);
      }
      if (query.ruc) {
        params = params.set('ruc', query.ruc);
      }

      // Filtros de fecha
      if (query.fechaDesde) {
        params = params.set('fechaDesde', query.fechaDesde);
      }
      if (query.fechaHasta) {
        params = params.set('fechaHasta', query.fechaHasta);
      }
      if (query.fechaIgual) {
        params = params.set('fechaIgual', query.fechaIgual);
      }
      if (query.operadorFecha !== undefined) {
        params = params.set('operadorFecha', query.operadorFecha.toString());
      }

      // Filtros de estado
      if (query.estadoPrefijo !== undefined) {
        params = params.set('estadoPrefijo', query.estadoPrefijo.toString());
      }
      if (query.estadoEmpresa !== undefined) {
        params = params.set('estadoEmpresa', query.estadoEmpresa.toString());
      }
      if (query.estadoGtin !== undefined) {
        params = params.set('estadoGtin', query.estadoGtin.toString());
      }

      // Filtro de usuario
      if (query.idUsuario !== undefined) {
        params = params.set('idUsuario', query.idUsuario.toString());
      }

      // Paginación
      if (query.pageNumber !== undefined) {
        params = params.set('pageNumber', query.pageNumber.toString());
      }
      if (query.pageSize !== undefined) {
        params = params.set('pageSize', query.pageSize.toString());
      }
    }

    return this.http.get<ApiResponse<PaginationResponse<ProductoLicenseResponse>>>(
      `${this.baseUrl}/ProductosLicenses/licenses`,
      { params }
    );
  }

  /**
   * Exporta productos en formato específico para API externa
   * Endpoint: GET /api/ProductosLicenses/licenses/export
   */
  exportProductosLicense(query?: ExportProductosQuery): Observable<ApiResponse<ExportProductosResponse>> {
    let params = new HttpParams();

    if (query) {
      // Filtros de texto
      if (query.nombreCliente) {
        params = params.set('nombreCliente', query.nombreCliente);
      }
      if (query.codigoPrefijo) {
        params = params.set('codigoPrefijo', query.codigoPrefijo);
      }
      if (query.ruc) {
        params = params.set('ruc', query.ruc);
      }

      // Filtros de fecha
      if (query.fechaDesde) {
        params = params.set('fechaDesde', query.fechaDesde);
      }
      if (query.fechaHasta) {
        params = params.set('fechaHasta', query.fechaHasta);
      }
      if (query.fechaIgual) {
        params = params.set('fechaIgual', query.fechaIgual);
      }
      if (query.operadorFecha !== undefined) {
        params = params.set('operadorFecha', query.operadorFecha.toString());
      }

      // Filtros de estado
      if (query.estadoPrefijo !== undefined) {
        params = params.set('estadoPrefijo', query.estadoPrefijo.toString());
      }
      if (query.estadoEmpresa !== undefined) {
        params = params.set('estadoEmpresa', query.estadoEmpresa.toString());
      }
      if (query.estadoGtin !== undefined) {
        params = params.set('estadoGtin', query.estadoGtin.toString());
      }

      // Filtro de usuario
      if (query.idUsuario !== undefined) {
        params = params.set('idUsuario', query.idUsuario.toString());
      }

      // Tamaño del lote
      if (query.batchSize !== undefined) {
        params = params.set('batchSize', query.batchSize.toString());
      }
    }

    return this.http.get<ApiResponse<ExportProductosResponse>>(
      `${this.baseUrl}/ProductosLicenses/licenses/export`,
      { params }
    );
  }

  /**
   * Envía productos a API externa VERIFIED
   * Endpoint: POST /api/SendToApiVerified/send-to-api
   */
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

   /**
   * Envía licencias de CLIENTES a API externa VERIFIED
   */
  sendLicenciasToApi(licencias: any[]): Observable<{
    success: boolean;
    message: string;
    processedCount?: number;
    errors?: string[];
    error?: string;
  }> {
    const request: SendToApiRequest = {
      apiType: 'licenses',
      products: licencias   // Directamente las licencias, no anidado
    };

    return this.sendProductosToApi(request);
  }

  // ========== MÉTODOS HELPER PARA PRODUCTOS ==========

  /**
   * Método helper para obtener productos con parámetros individuales
   */
  getProductosLicenseSimple(
    nombreCliente?: string,
    codigoPrefijo?: string,
    fechaDesde?: string,
    fechaHasta?: string,
    fechaIgual?: string,
    ruc?: string,
    estadoPrefijo?: boolean,
    estadoEmpresa?: number,
    estadoGtin?: boolean,
    idUsuario?: number,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Observable<ApiResponse<PaginationResponse<ProductoLicenseResponse>>> {
    const query: ProductoLicenseQuery = {
      nombreCliente,
      codigoPrefijo,
      fechaDesde,
      fechaHasta,
      fechaIgual,
      ruc,
      estadoPrefijo,
      estadoEmpresa,
      estadoGtin,
      idUsuario,
      pageNumber,
      pageSize
    };

    return this.getProductosLicense(query);
  }

  /**
   * Envía productos a API de GTINs
   */
  sendProductosToGtinsApi(products: ExportProductoResponse[]): Observable<any> {
    const request: SendToApiRequest = {
      apiType: 'gtins',
      products: products
    };
    return this.sendProductosToApi(request);
  }

  /**
   * Envía productos a API de Licencias
   */
  sendProductosToLicenciasApi(products: ExportProductoResponse[]): Observable<any> {
    const request: SendToApiRequest = {
      apiType: 'licencias',
      products: products
    };
    return this.sendProductosToApi(request);
  }

  // ========== FUNCIONES HELPER PARA MAPEO ==========

  /**
   * Convierte filtros del formulario a ProductoLicenseQuery
   */
  mapSearchParamsToProductoQuery(
    searchParams: any,
    currentPage: number,
    pageSize: number
  ): ProductoLicenseQuery {
    return {
      nombreCliente: searchParams.nombreCliente,
      codigoPrefijo: searchParams.prefijo,
      fechaDesde: searchParams.fechaDesde,
      fechaHasta: searchParams.fechaHasta,
      fechaIgual: searchParams.fechaIgual,
      ruc: searchParams.ruc,
      estadoPrefijo: searchParams.prefijoEstado === 'active' ? true :
                      searchParams.prefijoEstado === 'inactive' ? false : undefined,
      estadoEmpresa: searchParams.empresaEstado === 'active' ? 1 :
                     searchParams.empresaEstado === 'inactive' ? 2 : undefined,
      estadoGtin: searchParams.gtinEstado === 'active' ? true :
                  searchParams.gtinEstado === 'inactive' ? false : undefined,
      idUsuario: searchParams.idUsuario,
      pageNumber: currentPage,
      pageSize: pageSize
    };
  }

  /**
   * Convierte filtros del formulario a ExportProductosQuery
   */
  mapSearchParamsToExportQuery(
    searchParams: any,
    batchSize: number = 1000
  ): ExportProductosQuery {
    return {
      nombreCliente: searchParams.nombreCliente,
      codigoPrefijo: searchParams.prefijo,
      fechaDesde: searchParams.fechaDesde,
      fechaHasta: searchParams.fechaHasta,
      fechaIgual: searchParams.fechaIgual,
      ruc: searchParams.ruc,
      estadoPrefijo: searchParams.prefijoEstado === 'active' ? true :
                      searchParams.prefijoEstado === 'inactive' ? false : undefined,
      estadoEmpresa: searchParams.empresaEstado === 'active' ? 1 :
                     searchParams.empresaEstado === 'inactive' ? 2 : undefined,
      estadoGtin: searchParams.gtinEstado === 'active' ? true :
                  searchParams.gtinEstado === 'inactive' ? false : undefined,
      idUsuario: searchParams.idUsuario,
      batchSize: batchSize
    };
  }

  /**
   * Mapea ProductoLicenseResponse a formato para tabla (opcional)
   */
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

  /**
 * Obtiene el detalle completo de un producto por código de barras (GTIN)
 * @param gtin Código GTIN-13 del producto
 */
getProductoDetalle(gtin: string): Observable<ApiResponse<ProductoDetalleResponse>> {
  const params = new HttpParams().set('gtin', gtin);

  return this.http.get<ApiResponse<ProductoDetalleResponse>>(
    `${this.baseUrl}/ProductosLicenses/detalle`,
    { params }
  );
}

/**
 * Método helper para validar GTIN
 * @param gtin Código a validar
 */
isValidGtin(gtin: string): boolean {
  if (!gtin) return false;
  if (gtin.length !== 13) return false;
  return /^\d+$/.test(gtin);
}

/**
 * Método helper para formatear URL del sitio web
 * @param website URL del sitio web
 */
formatWebsiteUrl(website: string | undefined): string {
  if (!website || website === 'N/A' || website.trim() === '') return '';
  return website.startsWith('http') ? website : `https://${website}`;
}

}
