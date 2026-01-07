// src/app/services/nota-credito.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import {  HttpResponse } from '@angular/common/http';
import { FacturaValidacionResponse } from '../interfaces/responses/factura-validacion-response';
import { NotaCreditoReporteResponse } from '../interfaces/responses/nota-credito-reporte-response';
import { ReporteNotasCreditoResponse } from '../interfaces/responses/totales-ventas-response';

export interface FacturaListResponse {
  idNota: number;
  numeroFactura: string;
  fecha: string;            // o Date si prefieres convertir
  cliente: string;
  idCliente: number;
  rucCliente: string;
  dirCliente: string;
  total: number;
  cajero: string;
  caja: string;
  estado: string;           // "Activa" | "Anulada" | "Borrador"
  xmlGenerado: boolean;
  claveAcceso: string | null;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message: string;
}

export interface ApiResponse<T> {
  id: string;
  type: 'Success' | 'Error' | string;
  data: T | null;
  message: string;
  count: number | null;
}

// ========= TIPOS DEL DETALLE POR idNota (según tu JSON) =========
export interface ClienteMini {
  id: number;
  nombre: string;
  ruc: string;
  direccion: string;
  telefono: string;
}

export interface FacturaCore {
  idNota: number;
  numeroFactura: string;
  fecha: string;           // si quieres Date, puedes mapear abajo
  cliente: ClienteMini;
  subtotal: number;
  descuentoTotal: number;
  ivaTotal: number;
  total: number;
  observaciones: string;
  cajero: string;
  xmlGenerado: boolean;
  claveAcceso: string | null;
}

export interface DetalleItem {
  idProducto: number;
  codigoProducto: string;
  codigoBar: string;
  nombreProducto: string;
  obs2: string;
  cantidad: number;
  precio: number;
  descuento: number;
  subtotal: number;
  iva: number;
  total: number;
}

export interface PagoItem {
  idFormaPago: number;
  descripcionPago: string;
  clasificacion: string;
  valor: number;
  referencia: string;
  codPlazo: string;
  banco: string;
  numerocuenta_tarjeta: string;
  chequeCaduca: string;
  duenio: string;
  autoriza: string;
}

/** Lo que viene en data: { factura, detalles, pagos } */
export interface FacturaCompletaData {
  factura: FacturaCore;
  detalles: DetalleItem[];
  pagos: PagoItem[];
}
export interface NotaCreditoDetalleReq {
  codpro: string;
  cantidad: number;
  precio: number;
  costo: number;
  iva: number;
  descuento: number;
  tipoIva: string;     // p.ej. "0" | "1" | "2" …
  cueCodigo: number;
}

export interface NotaCreditoFormaPagoReq {
  id: string;                 // "NC", "EF", etc.
  clientesCodigo: number;
  numnota: string | null;     // puede ir null
  numdoc: string;             // "001001000000004"
  forpag: string;             // código forma pago (p.ej. "3")
  valor: number;              // monto pagado
  cuentaContable: string;     // "110205-002"
  estado: string;             // "A"
  fila: number;
  fecha: string;              // ISO: new Date().toISOString()
  idNotaCredito: number;      // 0 para crear
}

export interface NotaCreditoCrearReq {
  clienteCodigo: number;
  caja: string;               // "001"
  observaciones: string;
  idAutorizacionCaja: number;
  idUsuarioResponsable: number;
  idEmpresa:number;
  ateCodigo: number;
  historiaClinica: string;
  detalles: NotaCreditoDetalleReq[];
  formasPago: NotaCreditoFormaPagoReq[];
}

export interface NotaCreditoCrearResp {
  idNotaCredito: number;
  numeroNota?: string;
}

// 👇 Agrega esta interfaz (ajústala si tu API devuelve otros campos)
export interface GenerarXmlNotaCreditoResponse {
  success: boolean;
  message: string;
  fileName: string;
  savedPath: string;
}
export interface SaldoFacturaResponse {
  numeroFactura: string;
  totalDebe: number;
  totalHaber: number;
  saldo: number;
}

export interface GetSaldoFacturaOptions {
  excluirPagosAnulados?: boolean;
  excluirMovimientosAnulados?: boolean;
}


@Injectable({ providedIn: 'root' })
export class NotaCreditoService {
  private http = inject(HttpClient);
  private baseUrl = environment.invoices_sic; // p.ej. "http://localhost:5010/invoices-sic"

  /**
   * Busca facturas por número usando LIKE.
   * - Si usarSufijo=true y envías "001001000000131", el backend buscará "%131".
   * - Puedes pasar fechaInicio/fechaFin para acotar por fechas.
   */
  buscarPorNumeroLike(
    numero: string,
    usarSufijo: boolean = true,
    page: number = 1,
    pageSize: number = 20,
    fechaInicio?: string | Date,
    fechaFin?: string | Date
  ): Observable<ApiResponse<PaginationResponse<FacturaListResponse>>> {
    let params = new HttpParams()
      .set('numero', numero)
      .set('usarSufijo', usarSufijo)
      .set('page', page)
      .set('pageSize', pageSize);

    if (fechaInicio) params = params.set('fechaInicio', this.toIsoDate(fechaInicio));
    if (fechaFin) params = params.set('fechaFin', this.toIsoDate(fechaFin));

    const url = `${this.baseUrl}/Facturacion/buscar-por-numero`;

    return this.http.get<ApiResponse<PaginationResponse<FacturaListResponse>>>(url, { params })
    // Si quieres convertir fecha:string → Date, descomenta el map:
    // .pipe(map(resp => this.mapFechas(resp)));
  }

  // ========= Helpers opcionales =========

  /** Normaliza a 'YYYY-MM-DD' (sin hora) si llega Date; si llega string, respeta tal cual. */
  private toIsoDate(d: string | Date): string {
    if (typeof d === 'string') return d;
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day}`;
  }

  /** Convierte campo fecha a Date (opcional). */
  private mapFechas(
    resp: ApiResponse<PaginationResponse<FacturaListResponse>>
  ): ApiResponse<PaginationResponse<FacturaListResponse>> {
    if (resp?.data?.items) {
      resp.data.items = resp.data.items.map(it => ({
        ...it,
        // convierte a Date si lo prefieres en tu app
        // fecha: new Date(it.fecha),
      }));
    }
    return resp;
  }
  // ========= SERVICIO: obtener factura por idNota =========
  /**
   * Trae la factura completa por idNota.
   * Endpoint esperado (según tu controller): GET {baseUrl}/Facturacion/detalle/{idNota}
   * Si tu ruta real es distinta, ajusta la URL.
   */
  getFacturaPorIdNota(idNota: number): Observable<ApiResponse<FacturaCompletaData>> {
    const url = `${this.baseUrl}/Facturacion/detalle/${idNota}`;

    return this.http.get<ApiResponse<FacturaCompletaData>>(url);
    // Si quieres mapear fecha a Date:
    // .pipe(map(resp => this.mapFacturaFecha(resp)));
  }

  // (opcional) convertir 'fecha' a Date
  private mapFacturaFecha(
    resp: ApiResponse<FacturaCompletaData>
  ): ApiResponse<FacturaCompletaData> {
    if (resp?.data?.factura?.fecha) {
      resp.data.factura.fecha = new Date(resp.data.factura.fecha) as unknown as any; // si cambias el tipo a Date en FacturaCore
    }
    return resp;
  }

  crearNotaCredito(payload: NotaCreditoCrearReq) {
    const url = `${this.baseUrl}/NotasCredito/crear`;
    return this.http.post<ApiResponse<NotaCreditoCrearResp>>(url, payload);
  }

  generarXmlNotaCredito(idNotaCredito: number) {
  // Si environment.invoices_sic ya incluye '/invoices-sic/api', esto queda así:
  const url = `${this.baseUrl}/NotasCredito/${idNotaCredito}/xml`;
  // el body puede ir vacío; ajusta si tu backend espera algo
  return this.http.post<ApiResponse<GenerarXmlNotaCreditoResponse>>(url, {});
}
getPdfNotaCreditoResponse(idNotaCredito: number): Observable<HttpResponse<Blob>> {
    const url = `${this.baseUrl}/NotasCredito/${idNotaCredito}/pdf`;
    return this.http.get(url, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  /** Solo el Blob del PDF. */
  getPdfNotaCredito(idNotaCredito: number): Observable<Blob> {
    return this.getPdfNotaCreditoResponse(idNotaCredito).pipe(
      map(res => res.body as Blob)
    );
  }
/**
 * GET /NotaCreditoReporte?fechaInicio=...&fechaFin=...&page=1&pageSize=20
 * Obtiene reporte de notas de crédito por rango de fechas CON TOTALES
 */
getReporteNotasCredito(
  fechaInicio: Date | string,
  fechaFin: Date | string,
  page: number = 1,
  pageSize: number = 20
): Observable<ApiResponse<ReporteNotasCreditoResponse>> {
  const url = `${this.baseUrl}/NotasCredito/reporte`;

  let params = new HttpParams()
    .set('fechaInicio', this.toIsoDateTime(fechaInicio, true))
    .set('fechaFin', this.toIsoDateTime(fechaFin, false))
    .set('page', String(page))
    .set('pageSize', String(pageSize));

  return this.http.get<ApiResponse<ReporteNotasCreditoResponse>>(url, { params })
    .pipe(
      map(resp => {
        if (resp.type !== 'Success' && resp.type !== 'success') {
          throw new Error(resp.message || 'Error al obtener reporte de notas de crédito');
        }
        return resp;
      }),
      catchError(err => {
        console.error('[NotaCreditoService] getReporteNotasCredito error:', err);
        return throwError(() => err);
      })
    );
}

/**
 * Obtiene TODAS las notas de crédito sin paginar (para exportar a Excel)
 */
getReporteNotasCreditoCompleto(
  fechaInicio: Date | string,
  fechaFin: Date | string
): Observable<ApiResponse<ReporteNotasCreditoResponse>> {
  return this.getReporteNotasCredito(fechaInicio, fechaFin, 1, 10000);
}

  /** Descarga el PDF en el navegador usando el nombre del header si viene. */
  // ✅ Igual que descargarPdfFactura: simple, sin headers
descargarPdfNotaCredito(idNotaCredito: number, nombre = `nota-credito-${idNotaCredito}.pdf`): Observable<void> {
  const url = `${this.baseUrl}/NotasCredito/${idNotaCredito}/pdf`;
  return this.http.get<Blob>(url, { responseType: 'blob' as 'json' }).pipe(
    map(blob => {
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = nombre;      // pones tú el nombre
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    })
  );
}


  /** ====== Helpers ====== */

  /** Lee el filename del header Content-Disposition, si existe. */
  private getFileNameFromContentDisposition(res: HttpResponse<Blob>): string | null {
    const cd = res.headers.get('Content-Disposition') || res.headers.get('content-disposition');
    if (!cd) return null;
    const match = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
    if (!match || !match[1]) return null;
    try {
      return decodeURIComponent(match[1].replace(/"/g, ''));
    } catch {
      return match[1].replace(/"/g, '');
    }
  }
  // Helper privado para convertir fecha a ISO con hora
  private toIsoDateTime(date: Date | string, startOfDay: boolean): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (startOfDay) {
      d.setHours(0, 0, 0, 0);
    } else {
      d.setHours(23, 59, 59, 999);
    }
    return d.toISOString();
  }

private downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

getSaldoFactura(
  numeroFactura: string,
  opts?: GetSaldoFacturaOptions
) {
  const url = `${this.baseUrl}/EstadoCuenta/factura/${encodeURIComponent(numeroFactura)}/saldo`;
  let params = new HttpParams()
    .set('excluirPagosAnulados', String(opts?.excluirPagosAnulados ?? true))
    .set('excluirMovimientosAnulados', String(opts?.excluirMovimientosAnulados ?? true));

  return this.http.get<ApiResponse<SaldoFacturaResponse>>(url, { params });
}
  /**
   * Valida si una factura puede recibir nota de crédito
   * @param numeroFactura Número de factura a validar
   * @returns Observable con los datos de validación
   */
  validarFacturaParaNC(numeroFactura: string): Observable<FacturaValidacionResponse> {
    return this.http.get<FacturaValidacionResponse>(
      `${this.baseUrl}/NotasCredito/validar-factura/${numeroFactura}`
    );
  }

}
