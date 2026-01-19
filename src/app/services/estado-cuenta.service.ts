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
export interface ClienteConDeudaDto {
  codigo: number;
  nombre: string;
  total_debe: number;
  total_haber: number;
  saldo_total: number;
  cantidad_facturas: number;
}

export interface ResumenDeudaResponse {
  total_clientes: number;
  monto_total: number;
  total_facturas: number;
  promedio_deuda_por_cliente: number;
}

export interface FiltrosAplicadosDto {
  fecha_desde: string | null;
  fecha_hasta: string | null;
  saldo_minimo: number;
}

export interface ClientesConDeudaPaginadoResponse {
  clientes: PaginationResponse<ClienteConDeudaDto>;
  resumen: ResumenDeudaResponse;
}

export interface ClientesConDeudaCompletoResponse {
  clientes: ClienteConDeudaDto[];
  resumen: ResumenDeudaResponse;
  fecha_generacion: string;
  filtros: FiltrosAplicadosDto;
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
  //Servicio que trae TODOS los clientes con CXC
  getClientesConDeudaPaginado(opts: {
    fechaDesde?: string;
    fechaHasta?: string;
    saldoMinimo?: number;
    page?: number;
    pageSize?: number;
  } = {}): Observable<ApiResponse<ClientesConDeudaPaginadoResponse>> {
    let params = new HttpParams()
      .set('page', (opts.page ?? 1).toString())
      .set('pageSize', (opts.pageSize ?? 20).toString());

    if (opts.fechaDesde) params = params.set('fechaDesde', opts.fechaDesde);
    if (opts.fechaHasta) params = params.set('fechaHasta', opts.fechaHasta);
    if (opts.saldoMinimo !== undefined) params = params.set('saldoMinimo', opts.saldoMinimo.toString());

    return this.http.get<ApiResponse<ClientesConDeudaPaginadoResponse>>(
      `${this.baseUrl}/clientes-con-cxc`, 
      { params }
    );
  }

  getClientesConDeudaCompleto(opts: {
    fechaDesde?: string;
    fechaHasta?: string;
    saldoMinimo?: number;
  } = {}): Observable<ApiResponse<ClientesConDeudaCompletoResponse>> {
    let params = new HttpParams();

    if (opts.fechaDesde) params = params.set('fechaDesde', opts.fechaDesde);
    if (opts.fechaHasta) params = params.set('fechaHasta', opts.fechaHasta);
    if (opts.saldoMinimo !== undefined) params = params.set('saldoMinimo', opts.saldoMinimo.toString());

    return this.http.get<ApiResponse<ClientesConDeudaCompletoResponse>>(
      `${this.baseUrl}/clientes-con-cxc/exportar`, 
      { params }
    );
  }
  /**
   * Formatea fecha a yyyy-MM-dd para el backend
   */
  formatDateForApi(date: Date | string | null, incluirHoraFin: boolean = false): string | undefined {
    if (!date) return undefined;
    
    let d: Date;
    
    // 👇 CLAVE: Si viene del input date (string "yyyy-MM-dd"), parsear manualmente
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      d = new Date(year, month - 1, day); // constructor local, NO UTC
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return undefined;
    
    // Agregar horas según sea inicio o fin de día
    if (incluirHoraFin) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    
    // Retornar ISO
    return d.toISOString();
  }
}
