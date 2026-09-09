// src/app/services/facturacion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FacturaReporteResponse } from '../interfaces/responses/factura-reporte-response';
import { ReporteFacturasResponse } from '../interfaces/responses/totales-ventas-response';

export interface ApiResponse<T = any> {
  id?: string;
  type: 'Success' | 'Error' | 'NotFound' | string;
  data: T;
  message: string;
  count?: number;
}

export interface GenerarXmlFacturaResponse {
  success: boolean;
  message: string;
  fileName?: string;
  savedPath?: string;
}

export interface ProductoResponse {
  id_producto: number;
  codpro: string | null;
  despro: string | null;
  tippro: string | null;
  preven: number | null;
  precos: number | null;
  stock_min: number | null;
  stock_max: number | null;
  uniman: string | null;
  clas_prod: string | null;
  activo: boolean | null;
  codbar: string | null;
  prevensiniva: number | null;
  codcuedeb:string | null;
  id_empresa: number | null;
  id_plan:number | null;
}

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

export interface AnularFacturaRequest {
  motivoAnulacion: string;
  id_usuario_anula: number;
}

export interface FacturaAnuladaListResponse {
  idNota: number;
  numeroFactura: string;
  fecha: string; // ISO
  cliente: string;
  idCliente: number;
  rucCliente: string;
  dirCliente: string;
  total: number;
  cajero: string;
  caja: string;
  estado: string; // "Anulada"
  xmlGenerado: boolean;
  claveAcceso: string | null;
  observacion: string | null;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message: string;
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

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private baseUrl = environment.invoices_sic; // ej: http://localhost:5000  (ajusta si tu baseUrl ya incluye /api)

  constructor(private http: HttpClient) { }

  /**
   * GET /producto/by-codpro-fixed
   */
  getProductosCodproFijos(): Observable<ProductoResponse[]> {
    const url = `${this.baseUrl}/producto/by-codpro-fixed`;
    return this.http.get<ApiResponse<ProductoResponse[]>>(url).pipe(
      map(resp => {
        if (resp.type !== 'Success') {
          throw new Error(resp.message || 'Error al obtener productos');
        }
        return resp.data ?? [];
      }),
      catchError(err => {
        console.error('[FacturacionService] getProductosCodproFijos error:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * GET /producto/by-codpro?codigos=1174&codigos=1175...
   */
  getProductosPorCodigos(codigos: string[]): Observable<ProductoResponse[]> {
    const url = `${this.baseUrl}/producto/by-codpro`;
    let params = new HttpParams();
    codigos.forEach(c => params = params.append('codigos', c));

    return this.http.get<ApiResponse<ProductoResponse[]>>(url, { params }).pipe(
      map(resp => {
        if (resp.type !== 'Success') {
          throw new Error(resp.message || 'Error al obtener productos');
        }
        return resp.data ?? [];
      }),
      catchError(err => {
        console.error('[FacturacionService] getProductosPorCodigos error:', err);
        return throwError(() => err);
      })
    );
  }

  crear(payload: FacturaCrearRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/Facturacion/crear`, payload).pipe(
      catchError(err => {
        console.error('[FacturacionService] crear error:', err);
        return throwError(() => err);
      })
    );
  }

  /** GET XML como string */
  getXmlFactura(idNota: number): Observable<string> {
    const url = `${this.baseUrl}/Facturacion/${idNota}/xml`;
    return this.http.get(url, { responseType: 'text' }).pipe(
      catchError(err => {
        console.error('[FacturacionService] getXmlFactura error:', err);
        return throwError(() => err);
      })
    );
  }

  /** GET XML como Blob */
  getXmlFacturaBlob(idNota: number): Observable<Blob> {
    const url = `${this.baseUrl}/Facturacion/${idNota}/xml`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(err => {
        console.error('[FacturacionService] getXmlFacturaBlob error:', err);
        return throwError(() => err);
      })
    );
  }

  /** Helper para descargar Blob */
  descargarXmlFactura(idNota: number, nombre = `factura-${idNota}.xml`): Observable<void> {
    return this.getXmlFacturaBlob(idNota).pipe(
      map(blob => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      }),
      catchError(err => {
        console.error('[FacturacionService] descargarXmlFactura error:', err);
        return throwError(() => err);
      })
    );
  }

  generarXmlEnServidor(idNota: number): Observable<GenerarXmlFacturaResponse> {
    const url = `${this.baseUrl}/Facturacion/${idNota}/xml`;
    return this.http.post<GenerarXmlFacturaResponse>(url, {}).pipe(
      catchError(err => {
        console.error('[FacturacionService] generarXmlEnServidor error:', err);
        return throwError(() => err);
      })
    );
  }

  /** Descargar PDF (inicia descarga) */
  descargarPdfFactura(idNota: number, nombre = `factura-${idNota}.pdf`): Observable<void> {
    const url = `${this.baseUrl}/Facturacion/${idNota}/pdf`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      map((blob: Blob) => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      }),
      catchError(err => {
        console.error('[FacturacionService] descargarPdfFactura error:', err);
        return throwError(() => err);
      })
    );
  }

  getPdfFacturaBlob(idNota: number): Observable<Blob> {
    const url = `${this.baseUrl}/Facturacion/${idNota}/pdf`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(err => {
        console.error('[FacturacionService] getPdfFacturaBlob error:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * POST /Facturacion/anular/{idNota}
   * Body: { motivoAnulacion: string, id_usuario_anula: number }
   */
  anularFactura(
    idNota: number,
    motivoAnulacion: string,
    idUsuarioAnula: number
  ): Observable<ApiResponse<any>> {
    if (!idNota || idNota <= 0) {
      return throwError(() => new Error('idNota inválido.'));
    }

    const payload: AnularFacturaRequest = {
      motivoAnulacion: (motivoAnulacion ?? '').toUpperCase().trim(),
      id_usuario_anula: idUsuarioAnula
    };

    const url = `${this.baseUrl}/Facturacion/anular/${idNota}`;

    return this.http.post<ApiResponse<any>>(url, payload).pipe(
      map(resp => {
        if (resp?.type !== 'Success') {
          throw new Error(resp?.message || 'No se pudo anular la factura.');
        }
        return resp;
      }),
      catchError(err => {
        console.error('[FacturacionService] anularFactura error:', err);
        return throwError(() => err);
      })
    );
  }

  getFacturasAnuladas(opts: {
    clienteLike?: string | null;
    fechaInicio?: Date | string | null;
    fechaFin?: Date | string | null;
    page?: number;
    pageSize?: number;
  }): Observable<ApiResponse<PaginationResponse<FacturaAnuladaListResponse>>> {
    const url = `${this.baseUrl}/Facturacion/anuladas`;

    let params = new HttpParams()
      .set('page', String(opts.page ?? 1))
      .set('pageSize', String(opts.pageSize ?? 10));

    if (opts.clienteLike?.trim()) {
      params = params.set('clienteLike', opts.clienteLike.trim());
    }
    if (opts.fechaInicio) {
      params = params.set('fechaInicio', toLocalStartOfDay(opts.fechaInicio));
    }
    if (opts.fechaFin) {
      params = params.set('fechaFin', toLocalEndOfDay(opts.fechaFin));
    }

    return this.http.get<ApiResponse<PaginationResponse<FacturaAnuladaListResponse>>>(url, { params })
      .pipe(
        map(resp => {
          if (resp.type !== 'Success') throw new Error(resp.message || 'No se pudo obtener el listado de anuladas.');
          return resp;
        }),
        catchError(err => {
          console.error('[FacturacionService] getFacturasAnuladas error:', err);
          return throwError(() => err);
        })
      );
  }
    /**
   * PUT /Factura/ActualizarAsientoContable
   * Body: { idNota: number, numeroAsiento: string }
   */
 actualizarAsientoContable(
  idNota: number,
  numeroAsiento: string
): Observable<ApiResponse<boolean>> {
  // OJO: sin "/Factura"
  const url = `${this.baseUrl}/Facturacion/ActualizarAsientoContable`;

  const payload = {
    idNota,
    numeroAsiento: (numeroAsiento ?? '').toString().trim()
  };

  return this.http.put<ApiResponse<boolean>>(url, payload).pipe(
    map(resp => {
      if (resp.type !== 'Success') {
        throw new Error(resp.message || 'No se pudo actualizar el asiento contable.');
      }
      return resp;              // o resp.data si solo quieres el boolean
    }),
    catchError(err => {
      console.error('[FacturacionService] actualizarAsientoContable error:', err);
      return throwError(() => err);
    })
  );
}
/**
 * GET /FacturaReporte?fechaInicio=...&fechaFin=...&page=1&pageSize=20
 * Obtiene reporte de facturas por rango de fechas CON TOTALES
 */
getReporteFacturas(
  fechaInicio: Date | string,
  fechaFin: Date | string,
  page: number = 1,
  pageSize: number = 20
): Observable<ApiResponse<ReporteFacturasResponse>> {
  const url = `${this.baseUrl}/Facturacion/reporte`;

  let params = new HttpParams()
    .set('fechaInicio', toLocalStartOfDay(fechaInicio))
    .set('fechaFin', toLocalEndOfDay(fechaFin))
    .set('page', String(page))
    .set('pageSize', String(pageSize));

  return this.http.get<ApiResponse<ReporteFacturasResponse>>(url, { params })
    .pipe(
      map(resp => {
        if (resp.type !== 'Success' && resp.type !== 'success') {
          throw new Error(resp.message || 'Error al obtener reporte de facturas');
        }
        return resp;
      }),
      catchError(err => {
        console.error('[FacturacionService] getReporteFacturas error:', err);
        return throwError(() => err);
      })
    );
}
/**
 * Obtiene TODAS las facturas sin paginar (para exportar a Excel)
 */
getReporteFacturasCompleto(
  fechaInicio: Date | string,
  fechaFin: Date | string
): Observable<ApiResponse<ReporteFacturasResponse>> {
  return this.getReporteFacturas(fechaInicio, fechaFin, 1, 10000);
}
}

/* ---------- funciones auxiliares (fuera de la clase) ---------- */

/** Fecha-hora LOCAL en formato 'YYYY-MM-DDTHH:mm:ss.SSS' (sin 'Z') */
function toLocalStartOfDay(date: Date | string): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString(); // formato válido para DateTime
}

function toLocalEndOfDay(date: Date | string): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function fmtLocal(dt: Date): string {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  const ms = String(dt.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}`; // ← sin 'Z'
}
