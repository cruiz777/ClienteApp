// src/app/services/factura-detalle-prefijos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface ApiResponse<T> {
  id: string;
  type: 'Success' | 'NotFound' | 'Error' | string;
  data: T | null;
  message?: string;
  total?: number;
}

export interface FacturaDetallePrefijoResponse {
  idPagosPrefijo: number;
  clientesCodigo: number;
  codigoPrefijo: string | null;
  periodoDesde: string | null;   // ISO (DateOnly en back)
  periodoHasta: string | null;   // ISO (DateOnly en back)
  cantidad: number | null;
  descripcion: string | null;
  numnota: string | null;
  fechaFactura: string | null;   // ISO (DateOnly en back)
}

@Injectable({ providedIn: 'root' })
export class FacturaDetallePrefijosService {
  private baseUrl = environment.invoices_sic+ '/FacturaDetallePrefijos';

  constructor(private http: HttpClient) {}

  getByCodigo(codigoPrefijo: string): Observable<FacturaDetallePrefijoResponse[]> {
    return this.http
      .get<ApiResponse<FacturaDetallePrefijoResponse[]>>(
        `${this.baseUrl}/codigo/${encodeURIComponent(codigoPrefijo)}`
      )
      .pipe(map(r => r.data ?? []));
  }
}
