// cuenta-cobrar.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

/* ==== Tipos genéricos de API ==== */
export interface ApiResponse<T> {
  id: string;
  type: 'Success' | 'Error' | 'NotFound' | 'validation_error' | string;
  data: T | null;
  message: string;
  count?: number | null;
}

/* ==== CxC ==== */
export interface ApiRespuestaCxC {
  data?: {
    resumen_por_cliente?: {
      items?: Array<{
        cliente_codigo: string | number;
        nombre_cliente: string;
        facturas_pendientes: FacturaPendiente[] | null;
      }>;
    };
  };
}

export interface FacturaPendiente {
  numero_factura: string;
  fecha_factura: string;  // "dd/MM/yyyy"
  dias_vencimiento: number;
  total_factura: number;
  total_pagado: number;
  saldo_pendiente: number;
  tipo_documento: string;
  observacion: string;
}

/* ==== Pago (respuesta de creación) ==== */
export interface CreatePagoResponse {
  numero_pago?: string;   // snake_case como lo devuelve tu API
  // otros campos si los necesitas...
}

/* ==== Grid (una sola definición) ==== */
export interface GridRow {
  numero: string;               // "F - 001-..."
  numero_factura?: string;      // "001-..." (para payload)
  tipo_documento?: string;      // FACTURA | VT | NC | ...
  fecha: string;
  monto: number;
  pago: number;
  estado: string;
  vence: string;
  valueVencido: boolean;
  descripcion: string;
  ord: number;
}

/* ---- Pago (request) ---- */
export interface FacturaAPagar {
  numero_factura: string;
  tipo_documento: string;
  tipo: string;                 // <-- NECESARIO: 'P' | 'A'
  monto_a_pagar: number;
}

export interface FormaPagoItem {
  id_forma_pago: number;
  monto: number;
  referencia?: string;
  autorizacion?: string;
  banco?: string;
  numero_documento?: string;
}

export interface PagoRequest {
  cliente_codigo: number;        // <-- número, no string
  facturas_a_pagar: FacturaAPagar[];
  formas_pago: FormaPagoItem[];
  id_usuario_responsable: number;
  caja: string;
  observaciones?: string;
}

/* ==== Servicio ==== */
@Injectable({ providedIn: 'root' })
export class CuentaCobrarService {
  private readonly baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  /* --------- Estado de cuenta --------- */
  getFacturasPendientesGrid(clienteCodigo: string | number): Observable<GridRow[]> {
    const url = `${this.baseUrl}/EstadoCuenta/cuenta-cobrar/${encodeURIComponent(String(clienteCodigo))}`;
    const params = new HttpParams()
      .set('incluirDetalle', 'true')
      .set('saldoMinimo', '0.01')
      .set('page', '1')
      .set('pageSize', '50');

    return this.http.get<ApiRespuestaCxC>(url, { params }).pipe(
      map(res => this.mapResponseToGridRows(res, String(clienteCodigo)))
    );
  }

  getFacturasPendientesGridMock(json: ApiRespuestaCxC, clienteCodigo: string): Observable<GridRow[]> {
    return of(this.mapResponseToGridRows(json, clienteCodigo));
  }

  private mapResponseToGridRows(res: ApiRespuestaCxC, clienteCodigo: string): GridRow[] {
    const items = res?.data?.resumen_por_cliente?.items ?? [];
    const item = items.find(i => String(i?.cliente_codigo) === String(clienteCodigo)) ?? items[0];

    const facturas: FacturaPendiente[] = (item?.facturas_pendientes ?? []) as FacturaPendiente[];
    if (!Array.isArray(facturas) || facturas.length === 0) return [];

    return facturas.map((f): GridRow => {
      const pago = 0;
      const monto = this.to2(this.num(f.saldo_pendiente ?? f.total_factura));
      return {
        numero: `F - ${f.numero_factura}`,
        numero_factura: f.numero_factura,
        tipo_documento: f.tipo_documento,
        fecha: f.fecha_factura,
        monto,
        pago,
        estado: pago <= 0 ? 'PENDIENTE DE PAGO' : (pago >= monto ? 'CANCELADO' : 'ABONADO'),
        vence: f.fecha_factura,
        valueVencido: this.num(f.dias_vencimiento) > 0,
        descripcion: f.observacion || f.tipo_documento || '',
        ord: 1,
      };
    });
  }

  private num(v: any): number {
    return typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  }

  private to2(v: any): number {
    return Math.round(Number(v || 0) * 100) / 100;
  }

  private sanitizeString(s: any): string {
    return (s ?? '').toString().trim();
  }

  /* --------- Pagos --------- */
  registrarPago(req: PagoRequest): Observable<string> {
    const url = `${this.baseUrl}/Pagos`; // coherente con el controller [Route("api/[controller]")]
    return this.http.post<ApiResponse<CreatePagoResponse>>(url, req).pipe(
      map(res => {
        const n = res.data?.numero_pago;
        if (!n) throw new Error('No se recibió numero_pago en la respuesta');
        return n; // "PAG000031"
      })
    );
  }

  /** Construye el payload de pago desde datos de la UI */
  buildPagoRequest(params: {
    clienteCodigo: string | number;
    facturasSeleccionadas: Array<{ numero: string; tipo: string; montoPagar: number }>;
    formasPago: Array<{
      id: number; monto: number; referencia?: string; autorizacion?: string;
      banco?: string; numeroDocumento?: string;
    }>;
    usuarioId: number;
    caja: string;
    observaciones?: string;
  }): PagoRequest {

    const facturas_a_pagar: FacturaAPagar[] = (params.facturasSeleccionadas || [])
      .filter(f => this.to2(f.montoPagar) > 0)
      .map(f => ({
        numero_factura: this.sanitizeString(f.numero).replace(/^F\s*-\s*/i, ''),
        tipo_documento: this.sanitizeString('FACTURA'),
        tipo: this.sanitizeString(f.tipo).toUpperCase(), // debe ser 'P' o 'A'
        monto_a_pagar: this.to2(f.montoPagar),
      }));

    const formas_pago: FormaPagoItem[] = (params.formasPago || [])
      .filter(fp => this.to2(fp.monto) > 0)
      .map(fp => ({
        id_forma_pago: Number(fp.id),
        monto: this.to2(fp.monto),
        referencia: this.sanitizeString(fp.referencia),
        autorizacion: this.sanitizeString(fp.autorizacion),
        banco: this.sanitizeString(fp.banco),
        numero_documento: this.sanitizeString(fp.numeroDocumento),
      }));

    return {
      cliente_codigo: Number(params.clienteCodigo),  // número
      facturas_a_pagar,
      formas_pago,
      id_usuario_responsable: Number(params.usuarioId),
      caja: this.sanitizeString(params.caja),
      observaciones: this.sanitizeString(params.observaciones),
    };
  }

  /** Verifica que suma(formas_pago) == suma(facturas_a_pagar) (2 decimales) */
  validatePago(req: PagoRequest): { ok: boolean; diferencia: number } {
    const totalFacturas = this.to2(req.facturas_a_pagar.reduce((a, b) => a + this.to2(b.monto_a_pagar), 0));
    const totalFormas = this.to2(req.formas_pago.reduce((a, b) => a + this.to2(b.monto), 0));
    const dif = this.to2(totalFacturas - totalFormas);
    return { ok: Math.abs(dif) < 0.01, diferencia: dif };
  }
}
