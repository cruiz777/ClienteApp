import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';

import {
  UpdateClienteRequest,
  UpdateClientesMasivoRequest
} from '../interfaces/requests/update-cliente-request';

import {
  ClienteLicenseResponse
} from '../interfaces/responses/cliente-license-response';

import {
  ExportLicenseQuery,
  ExportLicenseResponse
} from '../interfaces/responses/export-licenses-response';

import {
  ExportProductosQuery,
  ProductoLicenseQuery
} from '../interfaces/responses/export-products-response';

import {
  ExportProductoResponse,
  ExportProductosResponse,
  ProductoDisplay,
  ProductoLicenseResponse
} from '../interfaces/responses/products-license-response';

import {
  SendToApiRequest
} from '../interfaces/requests/enviar-api-verified-request';

import {
  ProductoDetalleResponse
} from '../interfaces/responses/producto-detalle-response';

import {
  ClienteValidadoDTO,
  ClienteValidadoResultadoDTO
} from '../interfaces/requests/cliente-validado';

import {
  ClienteBasicoResponse
} from '../interfaces/responses/cliente-validar-response';

import {
  BatchUpdateResult
} from '../interfaces/requests/batch-update-result';


export interface ClienteLicenseQuery {
  nombreCliente?: string;
  codigoPrefijo?: string;

  fechaDesde?: string;
  fechaHasta?: string;
  fechaIgual?: string;

  ruc?: string;

  estadoPrefijo?: boolean;
  estadoEmpresa?: number;

  pageNumber?: number;
  pageSize?: number;
}


/**
 * Respuesta del endpoint específico de inactivación
 * de licencias en GS1 Verified.
 */
export interface InactivarLicenciasVerifiedResponse {
  success: boolean;

  message: string;

  processedCount?: number;

  externalStatusCode?: number;

  externalStatus?: string;

  requestId?: string;

  responseData?: string;

  errors?: string[];

  error?: string;
}

export interface AuditoriaLicenciaVerifiedResponse {
  idAuditoria: number;

  licenceKey: string;

  licenceType?: string;

  clientesCodigo?: number;

  licenseeName?: string;

  licenseeGln?: string;

  estadoAnterior?: string;

  estadoNuevo?: string;

  idEstadoEmpresaAntes?: number;

  idEstadoEmpresaNuevo?: number;

  gs1HttpStatus?: number;

  gs1Status?: string;

  gs1RequestId?: string;

  gs1Response?: string;

  actualizacionLocalOk: boolean;

  usuario?: string;

  fecha?: string;

  error?: string;
}

export interface AuditoriaProductoVerifiedRequest {
  gtin: string;
  nombreCliente?: string;
  codigoPrefijo?: string;
  licenceKey?: string;
  brandName?: string;
  productDescription?: string;
  gtinStatusAnterior?: string;
  idUsuario?: number | null;
}

export interface AuditoriaProductoVerifiedResponse {
  idAuditoria: number;
  gtin: string;
  nombreCliente?: string;
  codigoPrefijo?: string;
  licenceKey?: string;
  brandName?: string;
  productDescription?: string;
  gtinStatusAnterior?: string;
  accion?: string;
  idUsuario?: number | null;
  fecha: string;
}

@Injectable({
  providedIn: 'root'
})
export class ValidacionService {

  private baseUrl =
    environment.validationUrl;


  constructor(
    private http: HttpClient
  ) {
  }


  // ==========================================================
  // VALIDACIÓN MASIVA CLIENTES
  // ==========================================================

  validarMasivo(
    clienteIds: number[]
  ): Observable<
    ApiResponse<
      ClienteValidadoResultadoDTO[]
    >
  > {

    return this.http.post<
      ApiResponse<
        ClienteValidadoResultadoDTO[]
      >
    >(
      `${this.baseUrl}/ClientesLicenses/validar-masivo`,
      clienteIds
    );
  }


  // ==========================================================
  // VALIDACIÓN UNITARIA CLIENTE
  // ==========================================================

  validarUno(
    clienteId: number
  ): Observable<
    ApiResponse<ClienteValidadoDTO>
  > {

    return this.http.post<
      ApiResponse<ClienteValidadoDTO>
    >(
      `${this.baseUrl}/ClientesLicenses/validar`,
      clienteId,
      {
        headers: {
          'Content-Type':
            'application/json'
        }
      }
    );
  }


  // ==========================================================
  // ACTUALIZAR CLIENTE
  // ==========================================================

  updateCliente(
    idCliente: number,
    request: UpdateClienteRequest
  ): Observable<
    ApiListResponse<boolean>
  > {

    return this.http.put<
      ApiListResponse<boolean>
    >(
      `${this.baseUrl}/ClientesLicenses/validacion/${idCliente}`,
      request
    );
  }


  // ==========================================================
  // ACTUALIZACIÓN MASIVA CLIENTES
  // ==========================================================

  updateClientesMasivo(
    request: UpdateClientesMasivoRequest
  ): Observable<
    ApiResponse<BatchUpdateResult>
  > {

    return this.http.put<
      ApiResponse<BatchUpdateResult>
    >(
      `${this.baseUrl}/ClientesLicenses/batch`,
      request
    );
  }


  // ==========================================================
  // CLIENTES BÁSICOS
  // ==========================================================

  getClientesBasicos(
    page: number = 1,
    pageSize: number = 10,
    letraInicial?: string,
    zona?: string,
    textoBusqueda?: string
  ): Observable<
    ApiResponse<
      PaginationResponse<
        ClienteBasicoResponse
      >
    >
  > {

    let params =
      new HttpParams()
        .set(
          'page',
          page.toString()
        )
        .set(
          'pageSize',
          pageSize.toString()
        );


    if (
      letraInicial &&
      letraInicial.trim()
    ) {

      params =
        params.set(
          'letraInicial',
          letraInicial.trim()
        );
    }


    if (
      zona &&
      zona.trim()
    ) {

      params =
        params.set(
          'zona',
          zona.trim()
        );
    }


    if (
      textoBusqueda &&
      textoBusqueda.trim()
    ) {

      params =
        params.set(
          'textoBusqueda',
          textoBusqueda.trim()
        );
    }


    return this.http.get<
      ApiResponse<
        PaginationResponse<
          ClienteBasicoResponse
        >
      >
    >(
      `${this.baseUrl}/ClientesLicenses/basicos`,
      {
        params
      }
    );
  }


  // ==========================================================
  // IDS CLIENTES FILTRADOS
  // ==========================================================

  getClientesIdsFiltrados(
    letraInicial?: string,
    zona?: string,
    textoBusqueda?: string
  ): Observable<
    ApiResponse<number[]>
  > {

    let params =
      new HttpParams();


    if (
      letraInicial &&
      letraInicial.trim()
    ) {

      params =
        params.set(
          'letraInicial',
          letraInicial.trim()
        );
    }


    if (
      zona &&
      zona.trim()
    ) {

      params =
        params.set(
          'zona',
          zona.trim()
        );
    }


    if (
      textoBusqueda &&
      textoBusqueda.trim()
    ) {

      params =
        params.set(
          'textoBusqueda',
          textoBusqueda.trim()
        );
    }


    return this.http.get<
      ApiResponse<number[]>
    >(
      `${this.baseUrl}/ClientesLicenses/basicos/ids`,
      {
        params
      }
    );
  }


  // ==========================================================
  // LICENCIAS CLIENTES - CONSULTA
  // ==========================================================

  getClientesLicense(
    query?: ClienteLicenseQuery
  ): Observable<
    ApiResponse<
      PaginationResponse<
        ClienteLicenseResponse
      >
    >
  > {

    let params =
      new HttpParams();


    if (query) {

      if (
        query.nombreCliente
      ) {

        params =
          params.set(
            'nombreCliente',
            query.nombreCliente
          );
      }


      if (
        query.codigoPrefijo
      ) {

        params =
          params.set(
            'codigoPrefijo',
            query.codigoPrefijo
          );
      }


      if (
        query.fechaDesde
      ) {

        params =
          params.set(
            'fechaDesde',
            query.fechaDesde
          );
      }


      if (
        query.fechaHasta
      ) {

        params =
          params.set(
            'fechaHasta',
            query.fechaHasta
          );
      }


      if (
        query.fechaIgual
      ) {

        params =
          params.set(
            'fechaIgual',
            query.fechaIgual
          );
      }


      if (
        query.ruc
      ) {

        params =
          params.set(
            'ruc',
            query.ruc
          );
      }


      if (
        query.estadoPrefijo !==
        undefined
      ) {

        params =
          params.set(
            'estadoPrefijo',
            query.estadoPrefijo
              .toString()
          );
      }


      if (
        query.estadoEmpresa !==
        undefined
      ) {

        params =
          params.set(
            'estadoEmpresa',
            query.estadoEmpresa
              .toString()
          );
      }


      if (
        query.pageNumber
      ) {

        params =
          params.set(
            'pageNumber',
            query.pageNumber
              .toString()
          );
      }


      if (
        query.pageSize
      ) {

        params =
          params.set(
            'pageSize',
            query.pageSize
              .toString()
          );
      }
    }


    return this.http.get<
      ApiResponse<
        PaginationResponse<
          ClienteLicenseResponse
        >
      >
    >(
      `${this.baseUrl}/ClientesLicenses/licenses`,
      {
        params
      }
    );
  }


  // ==========================================================
  // LICENCIAS CLIENTES - EXPORT
  // ==========================================================

  exportClientesLicense(
    query?: ExportLicenseQuery
  ): Observable<
    ApiResponse<
      ExportLicenseResponse
    >
  > {

    let params =
      new HttpParams();


    if (query) {

      if (
        query.nombreCliente
      ) {

        params =
          params.set(
            'nombreCliente',
            query.nombreCliente
          );
      }


      if (
        query.codigoPrefijo
      ) {

        params =
          params.set(
            'codigoPrefijo',
            query.codigoPrefijo
          );
      }


      if (
        query.fechaDesde
      ) {

        params =
          params.set(
            'fechaDesde',
            query.fechaDesde
          );
      }


      if (
        query.fechaHasta
      ) {

        params =
          params.set(
            'fechaHasta',
            query.fechaHasta
          );
      }


      if (
        query.fechaIgual
      ) {

        params =
          params.set(
            'fechaIgual',
            query.fechaIgual
          );
      }


      if (
        query.ruc
      ) {

        params =
          params.set(
            'ruc',
            query.ruc
          );
      }


      if (
        query.estadoPrefijo !==
        undefined
      ) {

        params =
          params.set(
            'estadoPrefijo',
            query.estadoPrefijo
              .toString()
          );
      }


      if (
        query.estadoEmpresa !==
        undefined
      ) {

        params =
          params.set(
            'estadoEmpresa',
            query.estadoEmpresa
              .toString()
          );
      }


      if (
        query.batchSize
      ) {

        params =
          params.set(
            'batchSize',
            query.batchSize
              .toString()
          );
      }
    }


    return this.http.get<
      ApiResponse<
        ExportLicenseResponse
      >
    >(
      `${this.baseUrl}/ClientesLicenses/licenses/export`,
      {
        params
      }
    );
  }


  // ==========================================================
  // ENVÍO GENÉRICO A VERIFIED
  // ==========================================================

  sendProductosToApi(
    request: SendToApiRequest
  ): Observable<{
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
    }>(
      `${this.baseUrl}/send-to-api`,
      request
    );
  }


  // ==========================================================
  // ENVÍO NORMAL DE LICENCIAS
  // ==========================================================

  /**
   * Se mantiene para el proceso normal de envío
   * de licencias a Verified.
   *
   * NO usar para inactivación.
   */
  sendLicenciasToApi(
    licencias: any[]
  ): Observable<{
    success: boolean;
    message: string;
    processedCount?: number;
    errors?: string[];
    error?: string;
  }> {

    const request:
      SendToApiRequest = {

      apiType:
        'licenses',

      products:
        licencias
    };


    return this.sendProductosToApi(
      request
    );
  }


  // ==========================================================
  // INACTIVAR LICENCIAS VERIFIED
  // ==========================================================

  /**
   * Endpoint exclusivo para inactivar licencias.
   *
   * El backend vuelve a forzar:
   *
   * licenceStatus = "INACTIVE"
   *
   * aunque Angular envíe otro estado.
   */
 // ==========================================================
// INACTIVAR LICENCIAS VERIFIED
// ==========================================================

inactivarLicenciasVerified(
  licencias: any[]
): Observable<InactivarLicenciasVerifiedResponse> {

  const request = {
    licences: licencias
  };

  return this.http.post<
    InactivarLicenciasVerifiedResponse
  >(
    `${this.baseUrl}/inactivate`,
    request
  );
}

  // ==========================================================
  // PRODUCTOS - CONSULTA
  // ==========================================================

  getProductosLicense(
    query?: ProductoLicenseQuery
  ): Observable<
    ApiResponse<
      PaginationResponse<
        ProductoLicenseResponse
      >
    >
  > {

    let params =
      new HttpParams();


    if (query) {

      if (
        query.nombreCliente
      ) {

        params =
          params.set(
            'nombreCliente',
            query.nombreCliente
          );
      }


      if (
        query.codigoPrefijo
      ) {

        params =
          params.set(
            'codigoPrefijo',
            query.codigoPrefijo
          );
      }


      if (
        query.ruc
      ) {

        params =
          params.set(
            'ruc',
            query.ruc
          );
      }


      if (
        query.fechaDesde
      ) {

        params =
          params.set(
            'fechaDesde',
            query.fechaDesde
          );
      }


      if (
        query.fechaHasta
      ) {

        params =
          params.set(
            'fechaHasta',
            query.fechaHasta
          );
      }


      if (
        query.fechaIgual
      ) {

        params =
          params.set(
            'fechaIgual',
            query.fechaIgual
          );
      }


      if (
        query.operadorFecha !==
        undefined
      ) {

        params =
          params.set(
            'operadorFecha',
            query.operadorFecha
              .toString()
          );
      }


      if (
        query.estadoPrefijo !==
        undefined
      ) {

        params =
          params.set(
            'estadoPrefijo',
            query.estadoPrefijo
              .toString()
          );
      }


      if (
        query.estadoEmpresa !==
        undefined
      ) {

        params =
          params.set(
            'estadoEmpresa',
            query.estadoEmpresa
              .toString()
          );
      }


      if (
        query.estadoGtin !==
        undefined
      ) {

        params =
          params.set(
            'estadoGtin',
            query.estadoGtin
              .toString()
          );
      }


      if (
        query.idUsuario !==
        undefined
      ) {

        params =
          params.set(
            'idUsuario',
            query.idUsuario
              .toString()
          );
      }


      if (
        query.pageNumber !==
        undefined
      ) {

        params =
          params.set(
            'pageNumber',
            query.pageNumber
              .toString()
          );
      }


      if (
        query.pageSize !==
        undefined
      ) {

        params =
          params.set(
            'pageSize',
            query.pageSize
              .toString()
          );
      }
    }


    return this.http.get<
      ApiResponse<
        PaginationResponse<
          ProductoLicenseResponse
        >
      >
    >(
      `${this.baseUrl}/ProductosLicenses/licenses`,
      {
        params
      }
    );
  }


  // ==========================================================
  // PRODUCTOS - EXPORT
  // ==========================================================

  exportProductosLicense(
    query?: ExportProductosQuery
  ): Observable<
    ApiResponse<
      ExportProductosResponse
    >
  > {

    let params =
      new HttpParams();


    if (query) {

      if (
        query.nombreCliente
      ) {

        params =
          params.set(
            'nombreCliente',
            query.nombreCliente
          );
      }


      if (
        query.codigoPrefijo
      ) {

        params =
          params.set(
            'codigoPrefijo',
            query.codigoPrefijo
          );
      }


      if (
        query.ruc
      ) {

        params =
          params.set(
            'ruc',
            query.ruc
          );
      }


      if (
        query.fechaDesde
      ) {

        params =
          params.set(
            'fechaDesde',
            query.fechaDesde
          );
      }


      if (
        query.fechaHasta
      ) {

        params =
          params.set(
            'fechaHasta',
            query.fechaHasta
          );
      }


      if (
        query.fechaIgual
      ) {

        params =
          params.set(
            'fechaIgual',
            query.fechaIgual
          );
      }


      if (
        query.operadorFecha !==
        undefined
      ) {

        params =
          params.set(
            'operadorFecha',
            query.operadorFecha
              .toString()
          );
      }


      if (
        query.estadoPrefijo !==
        undefined
      ) {

        params =
          params.set(
            'estadoPrefijo',
            query.estadoPrefijo
              .toString()
          );
      }


      if (
        query.estadoEmpresa !==
        undefined
      ) {

        params =
          params.set(
            'estadoEmpresa',
            query.estadoEmpresa
              .toString()
          );
      }


      if (
        query.estadoGtin !==
        undefined
      ) {

        params =
          params.set(
            'estadoGtin',
            query.estadoGtin
              .toString()
          );
      }


      if (
        query.idUsuario !==
        undefined
      ) {

        params =
          params.set(
            'idUsuario',
            query.idUsuario
              .toString()
          );
      }


      if (
        query.batchSize !==
        undefined
      ) {

        params =
          params.set(
            'batchSize',
            query.batchSize
              .toString()
          );
      }
    }


    return this.http.get<
      ApiResponse<
        ExportProductosResponse
      >
    >(
      `${this.baseUrl}/ProductosLicenses/licenses/export`,
      {
        params
      }
    );
  }


  // ==========================================================
  // MAP PRODUCTO PARA DISPLAY
  // ==========================================================

  mapProductoLicenseToDisplay(
    producto:
      ProductoLicenseResponse
  ): ProductoDisplay {

    return {

      id:
        producto.producto_id,

      gtin:
        producto.gtin,

      gtinStatus:
        producto.gtin_status,

      licenceKey:
        producto.licence_key,

      licenceType:
        producto.licence_type,

      brandName:
        producto.brand_name,

      productDescription:
        producto.product_description,

      productImageUrl:
        producto.product_image_url,

      netContentValue:
        producto.net_content_value,

      netContentUnitCode:
        producto.net_content_unit_code,

      nombreCliente:
        producto.nombre_cliente,

      codigoPrefijo:
        producto.codigo_prefijo,

      fechaCreacion:
        producto.fecha_creacion
    };
  }


  // ==========================================================
  // DETALLE PRODUCTO
  // ==========================================================

  getProductoDetalle(
    gtin: string
  ): Observable<
    ApiResponse<
      ProductoDetalleResponse
    >
  > {

    const params =
      new HttpParams()
        .set(
          'gtin',
          gtin
        );


    return this.http.get<
      ApiResponse<
        ProductoDetalleResponse
      >
    >(
      `${this.baseUrl}/ProductosLicenses/detalle`,
      {
        params
      }
    );
  }


  // ==========================================================
  // VALIDACIÓN GTIN
  // ==========================================================

  isValidGtin(
    gtin: string
  ): boolean {

    if (!gtin) {
      return false;
    }


    if (
      gtin.length !== 13
    ) {

      return false;
    }


    return /^\d+$/.test(
      gtin
    );
  }


  // ==========================================================
  // WEBSITE
  // ==========================================================

  formatWebsiteUrl(
    website:
      string | undefined
  ): string {

    if (
      !website ||
      website === 'N/A' ||
      website.trim() === ''
    ) {

      return '';
    }


    return website.startsWith(
      'http'
    )
      ? website
      : `https://${website}`;
  }


  // ==========================================================
  // ELIMINAR PRODUCTO VERIFIED
  // ==========================================================

  eliminarProductoVerified(
    request: {
      gtin: string;
      idUsuario?: number | null;
    }
  ) {

    return this.http.delete<any>(
      `${this.baseUrl}/ProductosLicenses/verified/eliminar-producto`,
      {
        body:
          request
      }
    );
  }

  // ======================================================
// AUDITORÍA DE LICENCIAS VERIFIED
// ======================================================

getAuditoriaLicenciasVerified(): Observable<{
  success: boolean;
  totalItems: number;
  data: AuditoriaLicenciaVerifiedResponse[];
}> {

  return this.http.get<{
    success: boolean;
    totalItems: number;
    data: AuditoriaLicenciaVerifiedResponse[];
  }>(
    `${this.baseUrl}/auditoria-licencias`
  );
}
registrarAuditoriaEliminarProducto(
  request: {
    gtin: string;
    nombreCliente?: string;
    codigoPrefijo?: string;
    licenceKey?: string;
    brandName?: string;
    productDescription?: string;
    gtinStatusAnterior?: string;
    idUsuario?: number | null;
  }
) {
  return this.http.post<any>(
    `${this.baseUrl}/verified/auditoria-eliminar-producto`,
    request
  );
}

getAuditoriaProductosEliminados():
  Observable<{
    success: boolean;
    count: number;
    data: AuditoriaProductoVerifiedResponse[];
  }> {

  const url =
    `${this.baseUrl}/verified/auditoria-eliminar-producto`;

  console.log(
    'GET AUDITORÍA PRODUCTOS:',
    url
  );

  return this.http.get<{
    success: boolean;
    count: number;
    data: AuditoriaProductoVerifiedResponse[];
  }>(
    url
  );
}
}