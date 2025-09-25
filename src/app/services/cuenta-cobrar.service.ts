// cuenta-cobrar.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiRespuestaCxC {
  data?: {
    resumen_por_cliente?: {
      items?: Array<{
        cliente_codigo: string;
        nombre_cliente: string;
        facturas_pendientes: FacturaPendiente[] | null;
        // ...otros totales del resumen
      }>
    }
  };
}

export interface FacturaPendiente {
  numero_factura: string;
  fecha_factura: string;       // "dd/MM/yyyy"
  dias_vencimiento: number;
  total_factura: number;
  total_pagado: number;
  saldo_pendiente: number;
  tipo_documento: string;
  observacion: string;
}

export interface GridRow {
  numero: string;
  fecha: string;
  monto: number;
  pago: number;
  estado: string;
  vence: string;
  valueVencido: boolean;
  descripcion: string;
  ord: number;
}

@Injectable({ providedIn: 'root' })
export class CuentaCobrarService {
  private readonly baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  getFacturasPendientesGrid(clienteCodigo: string): Observable<GridRow[]> {
    const url = `${this.baseUrl}/EstadoCuenta/cuenta-cobrar/${encodeURIComponent(clienteCodigo)}`;
    const params = new HttpParams()
      .set('incluirDetalle', 'true')
      .set('saldoMinimo', '0.01')
      .set('page', '1')
      .set('pageSize', '50');

    return this.http.get<ApiRespuestaCxC>(url, { params }).pipe(
      map(res => this.mapResponseToGridRows(res, clienteCodigo))
    );
  }

  getFacturasPendientesGridMock(json: ApiRespuestaCxC, clienteCodigo: string): Observable<GridRow[]> {
    return of(this.mapResponseToGridRows(json, clienteCodigo));
  }

  private mapResponseToGridRows(res: ApiRespuestaCxC, clienteCodigo: string): GridRow[] {
    const items = res?.data?.resumen_por_cliente?.items ?? [];
    // intenta encontrar el cliente solicitado; si no, toma el primero
    const item =
      items.find(i => String(i?.cliente_codigo) === String(clienteCodigo)) ??
      items[0];

    const facturas: FacturaPendiente[] = (item?.facturas_pendientes ?? []) as FacturaPendiente[];

    // Si el backend devolvió null (sin detalle), regresa []
    if (!Array.isArray(facturas) || facturas.length === 0) {
      return [];
    }

    return facturas.map((f): GridRow => {
      const pago = 0;
      const monto = num(f.saldo_pendiente ?? f.total_factura);
      return {
        numero: `F - ${f.numero_factura}`,
        fecha: f.fecha_factura,
        monto,
        pago,
        estado: pago <= 0 ? 'PENDIENTE DE PAGO' : (pago >= monto ? 'CANCELADO' : 'ABONADO'),
        vence: f.fecha_factura, // si tienes vencimiento real, cámbialo aquí
        valueVencido: num(f.dias_vencimiento) > 0,
        descripcion: f.observacion || f.tipo_documento || '',
        ord: 1,
      };
    });

    function num(v: any): number { return typeof v === 'string' ? parseFloat(v) : (v ?? 0); }
  }
}
