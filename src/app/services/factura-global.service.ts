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
  mantenimiento: number | null; // mensual
  subtotal: number;             // mantenimiento * 12 (backend)
  iva: number;                  // subtotal * 0.15
  total: number;                // subtotal + iva
  referencia: string;           // zona / descripción
  pIva: number;                 // % IVA vigente (ej. 15)
}

export interface FiltrosCodpreGrupo {
  busquedaGeneral?: string;
  prefijoBusqueda?: string;
  idZona?: number | string | null;
}

/* ========= DTOs de creación de factura ========= */
export interface FacturaDetalleRequest {
  idProducto: number;
  cantidad: number;
  precio: number;
  idDescuentoPredeterminado: number | null;
  porcentajeDescuentoManual: number | null;
  nombreProductoPersonalizado: string;
  ivaCalculado: number;        // MONTO de IVA del detalle
  subtotalCalculado: number;   // sin IVA
  descuentoCalculado: number;
  totalCalculado: number;
  codigoPrefijo: string;
  periodoDesde: string;        // yyyy-MM-dd
  periodoHasta: string;        // yyyy-MM-dd
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
  subtotalSIva: number;          // subtotal SIN IVA (cabecera)
  subtotalCalculado: number;     // igual al anterior si ya es sin IVA
  descuentoTotalCalculado: number;
  ivaTotalCalculado: number;     // MONTO de IVA
  totalCalculado: number;
  detalles: FacturaDetalleRequest[];
  formasPago: FacturaFormaPagoRequest[];
}

/* ========= Servicio ========= */
@Injectable({ providedIn: 'root' })
export class FacturaGlobalService {
  // Raíz del microservicio (asegúrate que environment.invoices_sic ya incluye el prefijo /api si aplica)
  private readonly apiRoot = environment.invoices_sic;

  private readonly clientesUrl = `${this.apiRoot}/clientes`;
  private readonly facturacionUrl = `${this.apiRoot}/Facturacion`; // según tu controlador .NET
  // si tu API usa /facturas en lugar de /Facturacion, cambia arriba a `${this.apiRoot}/facturas`

  constructor(private http: HttpClient) {}

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

    return this.http
      .get<ApiResponse<ClienteCodpreGrupoResponse[]>>(
        `${this.clientesUrl}/codpre-grupo`,
        { params }
      )
      .pipe(map(res => res.data ?? []));
  }

  /**
   * POST /Facturacion/crear
   * Crea la factura (cabecera + detalles + formas de pago)
   * Devuelve algún objeto con el id de la factura/nota creada.
   */
  crear(payload: FacturaCrearRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.facturacionUrl}/crear`, payload);
  }

  /**
   * POST /Facturacion/{idNota}/xml
   * Genera el XML de la factura/nota creada en servidor.
   * Si tu endpoint es /facturas/{id}/xml, cambia la URL.
   */
  generarXmlEnServidor(idNota: number): Observable<GenerarXmlFacturaResponse> {
    const url = `${this.facturacionUrl}/${idNota}/xml`;
    return this.http.post<GenerarXmlFacturaResponse>(url, {});
  }
}
