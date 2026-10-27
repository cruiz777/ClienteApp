// src/app/services/factura-global.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

/* ========= Tipos API ========= */
export interface ApiResponse<T = any> {
  type: 'Success' | 'Error' | 'NotFound' | string;
  message: string;
  data: T;
  count?: number;
}

export interface GenerarXmlFacturaResponse {
  success: boolean;
  message: string;
  fileName?: string;
  savedPath?: string;
}

/* ========= DTOs de consulta (codpre-grupo) ========= */
export interface ClienteCodpreGrupoResponse {
  codcli: number;
  ruccli: string;
  nomcli: string;
  ciudad: string;
  codpre: string;
  codigo_Grupo: string;
  mantenimiento: number | null;
  subtotal: number;
  iva: number;
  total: number;
  referencia: string;
  pIva: number;
  idCodContable?: number | null; // ✅ nullable (en UI a veces viene vacío)
}

export interface FiltrosCodpreGrupo {
  busquedaGeneral?: string;
  prefijoBusqueda?: string;
  idZona?: number | string | null;
  anioFactura?: number | null;
}

/* ========= DTOs de creación de factura ========= */
export interface FacturaDetalleRequest {
  idProducto: number;
  cantidad: number;
  precio: number;
  idDescuentoPredeterminado: number | null;
  porcentajeDescuentoManual: number | null;
  nombreProductoPersonalizado: string;
  ivaCalculado: number;
  subtotalCalculado: number;
  descuentoCalculado: number;
  totalCalculado: number;
  codigoPrefijo: string;
  periodoDesde: string;
  periodoHasta: string;
}

export interface FacturaFormaPagoRequest {
  idFormaPago: number;
  valor: number;
  referencia: string;
  observaciones: string;
  codPlazo: string;
  banco: string;
  numeroTarjeta: string;
  chequeCaduca: string;
  duenio: string;
  autoriza: string;
}

export interface FacturaCrearRequest {
  idCliente: number;
  caja: string;
  idUsuarioCajero: number;
  idDescuentoGlobal: number | null;
  porcentajeDescuentoGlobal: number | null;
  observaciones: string;
  anioFactura: number;
  numeroOrdenCompra: string;
  numeroGuiaRemision: string;
  prefijo: string;
  correo: string;
  facBloque: number;
  GrupoCliente: string;

  subtotalSIva: number;
  subtotalCalculado: number;
  descuentoTotalCalculado: number;
  ivaTotalCalculado: number;
  totalCalculado: number;

  detalles: FacturaDetalleRequest[];
  formasPago: FacturaFormaPagoRequest[];
}

@Injectable({ providedIn: 'root' })
export class FacturaGlobalService {
  private readonly apiRoot = environment.invoices_sic;

  private readonly clientesUrl = `${this.apiRoot}/clientes`;
  private readonly facturacionUrl = `${this.apiRoot}/Facturacion`;

  constructor(private http: HttpClient) { }

  /** GET /clientes/codpre-grupo */
  getClientesCodpreGrupo(
    filtros: FiltrosCodpreGrupo = {}
  ): Observable<ClienteCodpreGrupoResponse[]> {
    let params = new HttpParams();

    if (filtros.busquedaGeneral?.trim()) {
      params = params.set('BusquedaGeneral', filtros.busquedaGeneral.trim());
    }
    if (filtros.prefijoBusqueda?.trim()) {
      params = params.set('PrefijoBusqueda', filtros.prefijoBusqueda.trim());
    }
    if (
      filtros.idZona != null &&
      String(filtros.idZona).trim() !== '' &&
      Number(filtros.idZona) > 0
    ) {
      params = params.set('IdZona', String(filtros.idZona));
    }

    if (
      filtros.anioFactura != null &&
      String(filtros.anioFactura).trim() !== '' &&
      Number(filtros.anioFactura) > 0
    ) {
      params = params.set('AnioFactura', String(filtros.anioFactura));
    }

    return this.http
      .get<ApiResponse<ClienteCodpreGrupoResponse[]>>(
        `${this.clientesUrl}/codpre-grupo`,
        { params }
      )
      .pipe(map(res => res.data ?? []));
  }

  crear(payload: FacturaCrearRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.facturacionUrl}/crear`, payload);
  }

  generarXmlEnServidor(idNota: number): Observable<GenerarXmlFacturaResponse> {
    const url = `${this.facturacionUrl}/${idNota}/xml`;
    return this.http.post<GenerarXmlFacturaResponse>(url, {});
  }
}
