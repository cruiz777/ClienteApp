import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';

export interface SaldoFacturaItemResponse {
  fecha: string;
  tipDoc: string;
  numeroFactura: string;
  numeroDocumento: string;
  debe: number | null;
  haber: number | null;
  saldoLinea: number;
  observacion: string | null;
}

export interface SaldoFacturaResumenCliente {
  clienteCodigo: string;
  cliente: string;
  totalDebe: number;
  totalHaber: number;
  saldoFinal: number;
  cantidadMovimentos: number;
  detalle: SaldoFacturaItemResponse[];
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message: string | null;
}

export interface SaldoFacturaDetalladoResponse {
  resumenPorCliente: PaginationResponse<SaldoFacturaResumenCliente>;
  resumenGeneral: {
    totalClientesConsultados: number;
    totalDebeGeneral: number;
    totalHaberGeneral: number;
    saldoGeneralFinal: number;
    clientesConDeuda: number;
    clientesConSaldo: number;
    totalMovimientos: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EstadoCuentaService {

  // Ajusta el nombre de la propiedad según tu environment
  private readonly baseUrl = `${environment.invoices_sic}/EstadoCuenta`;

  constructor(private http: HttpClient) {}

  /**
   * GET /EstadoCuenta/saldo-facturas/cliente/{clienteCodigo}?incluirDetalle=...&page=...&pageSize=...
   */
  getSaldoFacturasPorCliente(
    clienteCodigo: number,
    incluirDetalle: boolean = true,
    page: number = 1,
    pageSize: number = 50
  ): Observable<ApiResponse<SaldoFacturaDetalladoResponse>> {

    const params = new HttpParams()
      .set('incluirDetalle', incluirDetalle.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    const url = `${this.baseUrl}/saldo-facturas/cliente/${clienteCodigo}`;

    return this.http.get<ApiResponse<SaldoFacturaDetalladoResponse>>(url, { params });
  }
}
