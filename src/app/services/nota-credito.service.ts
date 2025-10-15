// src/app/services/nota-credito.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

export interface FacturaListResponse {
  idNota: number;
  numeroFactura: string;
  fecha: string;            // o Date si prefieres convertir
  cliente: string;
  idCliente:number;
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
  idUsuarioResponsable: number;
  ateCodigo: number;
  historiaClinica: string;
  detalles: NotaCreditoDetalleReq[];
  formasPago: NotaCreditoFormaPagoReq[];
}

export interface NotaCreditoCrearResp {
  idNotaCredito: number;
  numeroNota?: string;
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

}
