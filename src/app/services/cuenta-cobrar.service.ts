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

/* ==== Paginación genérica ==== */
export interface PaginationResponse<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message?: string;
}

/* ========= Item RAW que devuelve /Pagos/todos ========= */
export interface PagoItemRaw {
  id_pago: number;
  numero_pago: string;
  tipo: 'P' | 'A' | string;
  cliente_codigo: number;
  cliente_nombre: string;
  fecha: string;
  numero_documento: string;
  pagado: string;
  total_pago: number;
  observaciones: string | null;
  tiene_retencion_iva: boolean | null;
  valor_retencion_iva: string | null;
  tiene_retencion_fuente: boolean | null;
  valor_retencion_fuente: string | null;
  caja: string | null;
  pago_anulado: boolean | null;
  fecha_anulacion: string | null;
  motivo_anulacion: string | null;
  anulado_por: number | null;
  estado: string | null;

  // ✅ AGREGADO
  asientoContable: string | null;

  detalles: any[] | null;
}

/* ========= Versión normalizada para la UI ========= */
export interface PagoItem {
  idPago: number;
  numeroPago: string;
  tipo: 'P' | 'A' | string;
  clienteCodigo: number;
  clienteNombre: string;
  fecha: string;
  numeroDocumento: string;
  pagado: number;
  totalPago: number;
  observaciones: string | null;
  tieneRetencionIva: boolean;
  valorRetencionIva: number | null;
  tieneRetencionFuente: boolean;
  valorRetencionFuente: number | null;
  caja: string | null;
  pagoAnulado: boolean;
  fechaAnulacion: string | null;
  motivoAnulacion: string | null;
  anuladoPor: number | null;
  estado: string | null;

  // ✅ AGREGADO
  asientoContable: string | null;

  detalles?: PagoDetalle[];
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
  fecha_factura: string;
  dias_vencimiento: number;
  total_factura: number;
  total_pagado: number;
  saldo_pendiente: number;
  tipo_documento: string;
  observacion: string;
  detalle: string;
}

/* ==== Pago creación ==== */
export interface CreatePagoResponse {
  numero_pago?: string;
}

/* ==== Grid ==== */
export interface GridRow {
  numero: string;
  numero_factura?: string;
  tipo_documento?: string;
  fecha: string;
  monto: number;
  pago: number;
  estado: string;
  vence: string;
  valueVencido: boolean;
  descripcion: string;
  ord: number;
  detalles?: string[];
  detalle?: string;
}

/* ---- Pago request ---- */
export interface FacturaAPagar {
  numero_factura: string;
  tipo_documento: string;
  tipo: string;
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
  cliente_codigo: number;
  facturas_a_pagar: FacturaAPagar[];
  formas_pago: FormaPagoItem[];
  id_usuario_responsable: number;
  caja: string;
  observaciones?: string;
}

/* ---- Anulación ---- */
export interface AnularPagoRequest {
  motivo_anulacion: string;
  id_usuario_responsable: number;
  fecha_anulacion?: string; 
}

export interface AnularPagoResponse {
  numero_pago?: string;
}

/* ==== Consulta Pago por número ==== */
export interface PagoDetalle {
  forma_pago: string;
  secuencia: string;
  monto: number;
  descripcion_pago: string;
  referencia: string;
  banco: string;
  numero_documento: string;
}

export interface PagoPorNumero {
  id_pago: number;
  numero_pago: string;
  tipo: 'P' | 'A';
  cliente_codigo: number;
  cliente_nombre: string;
  fecha: string;
  numero_documento: string;
  pagado: number;
  total_pago: number;
  observaciones?: string | null;
  tiene_retencion_iva: boolean;
  valor_retencion_iva?: number | null;
  tiene_retencion_fuente: boolean;
  valor_retencion_fuente?: number | null;
  caja: string;

  // ✅ AGREGADO
  asientoContable?: string | null;

  detalles: PagoDetalle[];
}

/* ========= Anulados ========= */
export interface PagoAnuladoItem {
  id_pago: number;
  numero_pago: string;
  tipo: string;
  cliente_codigo: number;
  cliente_nombre: string;
  fecha: string;
  numero_documento: string;
  pagado: string;
  total_pago: number;
  observaciones: string | null;
  tiene_retencion_iva: boolean | null;
  valor_retencion_iva: string | null;
  tiene_retencion_fuente: boolean | null;
  valor_retencion_fuente: string | null;
  caja: string | null;
  detalles: any[] | null;
  pago_anulado: boolean | null;
  fecha_anulacion: string | null;
  motivo_anulacion: string | null;
  anulado_por: number | null;
  estado: string | null;

  // ✅ AGREGADO
  asientoContable: string | null;
}

export interface PagoAnulado {
  idPago: number;
  numeroPago: string;
  tipo: string;
  clienteCodigo: number;
  clienteNombre: string;
  fecha: string;
  numeroDocumento: string;
  pagado: number;
  totalPago: number;
  observaciones: string | null;
  tieneRetencionIva: boolean;
  valorRetencionIva: number | null;
  tieneRetencionFuente: boolean;
  valorRetencionFuente: number | null;
  caja: string | null;
  pagoAnulado: boolean;
  fechaAnulacion: string | null;
  motivoAnulacion: string | null;
  anuladoPor: number | null;
  estado: string | null;

  // ✅ AGREGADO
  asientoContable: string | null;
}

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

      const rawDetalles = (f as any)?.detalles;
      const arr: string[] =
        Array.isArray(rawDetalles)
          ? rawDetalles
          : f.detalle
            ? [String(f.detalle).trim()]
            : [];

      const detallePlano = arr.map(s => String(s ?? '').trim()).filter(Boolean).join(' • ');

      return {
        numero: `F - ${f.numero_factura}`,
        numero_factura: f.numero_factura,
        tipo_documento: f.tipo_documento,
        fecha: f.fecha_factura,
        monto,
        pago,
        estado: pago <= 0 ? 'PENDIENTE DE PAGO' : pago >= monto ? 'CANCELADO' : 'ABONADO',
        vence: f.fecha_factura,
        valueVencido: this.num(f.dias_vencimiento) > 0,
        descripcion: f.observacion || f.tipo_documento || '',
        ord: 1,
        detalles: arr.length ? arr : undefined,
        detalle: detallePlano || 'SIN DETALLE',
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
    const url = `${this.baseUrl}/Pagos`;

    return this.http.post<ApiResponse<CreatePagoResponse>>(url, req).pipe(
      map(res => {
        const n = res.data?.numero_pago;
        if (!n) throw new Error('No se recibió numero_pago en la respuesta');
        return n;
      })
    );
  }

  buildPagoRequest(params: {
    clienteCodigo: string | number;
    facturasSeleccionadas: Array<{ numero: string; tipo: string; montoPagar: number }>;
    formasPago: Array<{
      id: number;
      monto: number;
      referencia?: string;
      autorizacion?: string;
      banco?: string;
      numeroDocumento?: string;
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
        tipo: this.sanitizeString(f.tipo).toUpperCase(),
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
      cliente_codigo: Number(params.clienteCodigo),
      facturas_a_pagar,
      formas_pago,
      id_usuario_responsable: Number(params.usuarioId),
      caja: this.sanitizeString(params.caja),
      observaciones: this.sanitizeString(params.observaciones),
    };
  }

  validatePago(req: PagoRequest): { ok: boolean; diferencia: number } {
    const totalFacturas = this.to2(
      req.facturas_a_pagar.reduce((a, b) => a + this.to2(b.monto_a_pagar), 0)
    );

    const totalFormas = this.to2(
      req.formas_pago.reduce((a, b) => a + this.to2(b.monto), 0)
    );

    const dif = this.to2(totalFacturas - totalFormas);
    return { ok: Math.abs(dif) < 0.01, diferencia: dif };
  }

  getPagoByNumero(numeroPago: string): Observable<PagoPorNumero> {
    const url = `${this.baseUrl}/Pagos/${encodeURIComponent(numeroPago)}`;

    return this.http.get<ApiResponse<PagoPorNumero[]>>(url).pipe(
      map(res => {
        const item: any = Array.isArray(res.data) ? res.data[0] : null;
        if (!item) throw new Error(`Pago ${numeroPago} no encontrado`);
        return this.normalizePago(item);
      })
    );
  }

  getPagoByNumeroRaw(numeroPago: string): Observable<ApiResponse<PagoPorNumero[]>> {
    const url = `${this.baseUrl}/Pagos/${encodeURIComponent(numeroPago)}`;
    return this.http.get<ApiResponse<PagoPorNumero[]>>(url);
  }

  private normalizePago(raw: any): PagoPorNumero {
    return {
      id_pago: Number(raw.id_pago),
      numero_pago: this.sanitizeString(raw.numero_pago),
      tipo: this.sanitizeString(raw.tipo) as 'P' | 'A',
      cliente_codigo: Number(raw.cliente_codigo),
      cliente_nombre: this.sanitizeString(raw.cliente_nombre),
      fecha: this.sanitizeString(raw.fecha),
      numero_documento: this.sanitizeString(raw.numero_documento),
      pagado: this.to2(this.num(raw.pagado)),
      total_pago: this.to2(this.num(raw.total_pago)),
      observaciones: raw.observaciones ?? null,
      tiene_retencion_iva: !!raw.tiene_retencion_iva,
      valor_retencion_iva: raw.valor_retencion_iva != null ? this.to2(this.num(raw.valor_retencion_iva)) : null,
      tiene_retencion_fuente: !!raw.tiene_retencion_fuente,
      valor_retencion_fuente: raw.valor_retencion_fuente != null ? this.to2(this.num(raw.valor_retencion_fuente)) : null,
      caja: this.sanitizeString(raw.caja),

      // ✅ AGREGADO
      asientoContable: raw.asientoContable ?? null,

      detalles: Array.isArray(raw.detalles)
        ? raw.detalles.map((d: any): PagoDetalle => ({
            forma_pago: this.sanitizeString(d.forma_pago),
            secuencia: this.sanitizeString(d.secuencia),
            monto: this.to2(this.num(d.monto)),
            descripcion_pago: this.sanitizeString(d.descripcion_pago),
            referencia: this.sanitizeString(d.referencia),
            banco: this.sanitizeString(d.banco),
            numero_documento: this.sanitizeString(d.numero_documento),
          }))
        : [],
    };
  }

  anularPago(numeroPago: string, req: AnularPagoRequest): Observable<string> {
    const nro = this.sanitizeString(numeroPago);
    if (!nro) throw new Error('numeroPago requerido');

    const url = `${this.baseUrl}/Pagos/anular/${encodeURIComponent(nro)}`;

    return this.http.post<ApiResponse<AnularPagoResponse | null>>(url, {
      motivo_anulacion: this.sanitizeString(req.motivo_anulacion),
      id_usuario_responsable: Number(req.id_usuario_responsable),
      fecha_anulacion: req.fecha_anulacion ?? null
    }).pipe(
      map(res => {
        const t = (res?.type || '').toLowerCase();

        if (t.includes('error') || t === 'notfound' || t === 'validation_error') {
          throw new Error(res?.message || 'Error anulando pago');
        }

        return res?.message || 'Pago anulado correctamente.';
      })
    );
  }

  /* --------- Pagos anulados --------- */
  getAnuladosRaw(opts: {
    incluirDetalle?: boolean;
    page?: number;
    pageSize?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    numeroPago?: string;
  } = {}): Observable<ApiResponse<PaginationResponse<PagoAnuladoItem>>> {
    const url = `${this.baseUrl}/Pagos/anulados`;

    let params = new HttpParams()
      .set('incluirDetalle', String(!!opts.incluirDetalle))
      .set('page', String(opts.page ?? 1))
      .set('pageSize', String(opts.pageSize ?? 20));

    if (opts.fechaDesde) params = params.set('fechaDesde', opts.fechaDesde);
    if (opts.fechaHasta) params = params.set('fechaHasta', opts.fechaHasta);
    if (opts.numeroPago) params = params.set('numeroPago', opts.numeroPago.trim());

    return this.http.get<ApiResponse<PaginationResponse<PagoAnuladoItem>>>(url, { params });
  }

  getAnulados(opts: {
    incluirDetalle?: boolean;
    page?: number;
    pageSize?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    numeroPago?: string;
  } = {}): Observable<PaginationResponse<PagoAnulado>> {
    return this.getAnuladosRaw(opts).pipe(
      map(res => {
        if (!res.data) {
          return {
            items: [],
            page: opts.page ?? 1,
            pageSize: opts.pageSize ?? 20,
            totalItems: 0,
            totalPages: 0,
            message: res.message,
          };
        }

        return {
          ...res.data,
          items: (res.data.items || []).map(this.normalizeItem),
        };
      })
    );
  }

  private normalizeItem = (raw: PagoAnuladoItem): PagoAnulado => ({
    idPago: Number(raw.id_pago),
    numeroPago: (raw.numero_pago ?? '').trim(),
    tipo: (raw.tipo ?? '').trim(),
    clienteCodigo: Number(raw.cliente_codigo),
    clienteNombre: (raw.cliente_nombre ?? '').trim(),
    fecha: raw.fecha ?? '',
    numeroDocumento: (raw.numero_documento ?? '').trim(),
    pagado: this.num(raw.pagado),
    totalPago: Number(raw.total_pago ?? 0),
    observaciones: raw.observaciones ?? null,
    tieneRetencionIva: !!raw.tiene_retencion_iva,
    valorRetencionIva: raw.valor_retencion_iva != null ? this.num(raw.valor_retencion_iva) : null,
    tieneRetencionFuente: !!raw.tiene_retencion_fuente,
    valorRetencionFuente: raw.valor_retencion_fuente != null ? this.num(raw.valor_retencion_fuente) : null,
    caja: raw.caja ?? null,
    pagoAnulado: !!raw.pago_anulado,
    fechaAnulacion: raw.fecha_anulacion ?? null,
    motivoAnulacion: raw.motivo_anulacion ?? null,
    anuladoPor: raw.anulado_por != null ? Number(raw.anulado_por) : null,
    estado: raw.estado ?? null,

    // ✅ AGREGADO
    asientoContable: raw.asientoContable ?? null,
  });

  /* --------- Pagos todos --------- */
  getPagosTodosRaw(opts: {
    incluirDetalle?: boolean;
    page?: number;
    pageSize?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    numeroPago?: string;
    clienteCodigo?: number;
    estado?: string;
  } = {}): Observable<ApiResponse<PaginationResponse<PagoItemRaw>>> {
    const url = `${this.baseUrl}/Pagos/todos`;

    let params = new HttpParams()
      .set('incluirDetalle', String(!!opts.incluirDetalle))
      .set('page', String(opts.page ?? 1))
      .set('pageSize', String(opts.pageSize ?? 20))
      .set('estado', opts.estado || 'todos');

    if (opts.fechaDesde) params = params.set('fechaDesde', opts.fechaDesde);
    if (opts.fechaHasta) params = params.set('fechaHasta', opts.fechaHasta);
    if (opts.numeroPago) params = params.set('numeroPago', opts.numeroPago.trim());
    if (opts.clienteCodigo) params = params.set('clienteCodigo', String(opts.clienteCodigo));

    return this.http.get<ApiResponse<PaginationResponse<PagoItemRaw>>>(url, { params });
  }

  getPagosTodos(opts: {
    incluirDetalle?: boolean;
    page?: number;
    pageSize?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    numeroPago?: string;
    clienteCodigo?: number;
    estado?: string;
  } = {}): Observable<PaginationResponse<PagoItem>> {
    return this.getPagosTodosRaw(opts).pipe(
      map(res => {
        if (!res.data) {
          return {
            items: [],
            page: opts.page ?? 1,
            pageSize: opts.pageSize ?? 20,
            totalItems: 0,
            totalPages: 0,
            message: res.message,
          };
        }

        return {
          ...res.data,
          items: (res.data.items || []).map(this.normalizePagoItem),
        };
      })
    );
  }

  private normalizePagoItem = (raw: PagoItemRaw): PagoItem => ({
    idPago: Number(raw.id_pago),
    numeroPago: (raw.numero_pago ?? '').trim(),
    tipo: (raw.tipo ?? '').trim() as any,
    clienteCodigo: Number(raw.cliente_codigo),
    clienteNombre: (raw.cliente_nombre ?? '').trim(),
    fecha: raw.fecha ?? '',
    numeroDocumento: (raw.numero_documento ?? '').trim(),
    pagado: this.num(raw.pagado),
    totalPago: Number(raw.total_pago ?? 0),
    observaciones: raw.observaciones ?? null,
    tieneRetencionIva: !!raw.tiene_retencion_iva,
    valorRetencionIva: raw.valor_retencion_iva != null ? this.num(raw.valor_retencion_iva) : null,
    tieneRetencionFuente: !!raw.tiene_retencion_fuente,
    valorRetencionFuente: raw.valor_retencion_fuente != null ? this.num(raw.valor_retencion_fuente) : null,
    caja: raw.caja ?? null,
    pagoAnulado: !!raw.pago_anulado,
    fechaAnulacion: raw.fecha_anulacion ?? null,
    motivoAnulacion: raw.motivo_anulacion ?? null,
    anuladoPor: raw.anulado_por != null ? Number(raw.anulado_por) : null,
    estado: raw.estado ?? null,

    // ✅ ESTA ES LA LÍNEA CLAVE
    asientoContable: raw.asientoContable ?? null,

    detalles: Array.isArray(raw.detalles)
      ? raw.detalles.map((d: any): PagoDetalle => ({
          forma_pago: this.sanitizeString(d.forma_pago),
          secuencia: this.sanitizeString(d.secuencia),
          monto: this.to2(this.num(d.monto)),
          descripcion_pago: this.sanitizeString(d.descripcion_pago),
          referencia: this.sanitizeString(d.referencia),
          banco: this.sanitizeString(d.banco),
          numero_documento: this.sanitizeString(d.numero_documento),
        }))
      : undefined,
  });

  actualizarAsientoContable(numeroPago: string, asientoContable: string): Observable<string> {
    const url = `${this.baseUrl}/Pagos/asiento-contable`;

    const body = {
      numeroPago: this.sanitizeString(numeroPago),
      asientoContable: this.sanitizeString(asientoContable),
    };

    return this.http.put<ApiResponse<boolean>>(url, body).pipe(
      map(res => {
        const t = (res?.type || '').toLowerCase();

        if (t.includes('error') || t === 'validation_error' || t === 'notfound') {
          throw new Error(res?.message || 'Error actualizando asiento contable');
        }

        return res?.message || 'Asiento contable actualizado correctamente.';
      })
    );
  }
}