// src/app/services/anticipo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, count, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnularAnticipoRequest, CreateAnticipoRequest, ReporteAnticipoRequest } from '../interfaces/requests/anticipo-request';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { AnticipoResponse, AnticipoDetalleResponse, SiguienteIdAntiicpo, AnticipoReporteItemResponse, ReporteAnticiposResponse } from '../interfaces/responses/anticipo-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { DesgloceAnticipoResponse } from '../interfaces/responses/desglose-anticipo-response';

export interface AnticipoFilters {
  page?: number;
  pageSize?: number;
  clientesCodigo?: number;
  cliente?: string;
  caja?: string;
  fechaDesde?: string; // formato: 'YYYY-MM-DD'
  fechaHasta?: string; // formato: 'YYYY-MM-DD'
  cancelado?: boolean;
  utilizado?: boolean;
  estado?: boolean;
  idTipoAnticipo?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnticipoService {
  private apiUrl = `${environment.invoices_sic}/Anticipo`;

  constructor(private http: HttpClient) {}

  /**
   * Crea un nuevo anticipo
   */
  create(request: CreateAnticipoRequest): Observable<ApiListResponse<AnticipoResponse>> {
    return this.http.post<ApiListResponse<AnticipoResponse>>(this.apiUrl, request);
  }

  /**
   * Lista todos los anticipos con paginación y filtros opcionales
   */
  getAll(filters?: AnticipoFilters): Observable<ApiListResponse<PaginationResponse<AnticipoResponse>>> {
    let params = new HttpParams();

    // Paginación (valores por defecto)
    params = params.set('page', (filters?.page || 1).toString());
    params = params.set('pageSize', (filters?.pageSize || 10).toString());

    // Filtros opcionales
    if (filters?.cliente) {
      params = params.set('cliente', filters.cliente);
    }

    if (filters?.caja) {
      params = params.set('caja', filters.caja);
    }

    if (filters?.fechaDesde) {
      params = params.set('fechaDesde', filters.fechaDesde);
    }

    if (filters?.fechaHasta) {
      params = params.set('fechaHasta', filters.fechaHasta);
    }

    if (filters?.cancelado !== undefined && filters?.cancelado !== null) {
      params = params.set('cancelado', filters.cancelado.toString());
    }

    if (filters?.utilizado !== undefined && filters?.utilizado !== null) {
      params = params.set('utilizado', filters.utilizado.toString());
    }

    if (filters?.estado !== undefined && filters?.estado !== null) {
      params = params.set('estado', filters.estado.toString());
    }

    if (filters?.idTipoAnticipo) {
      params = params.set('idTipoAnticipo', filters.idTipoAnticipo.toString());
    }

    return this.http.get<ApiListResponse<PaginationResponse<AnticipoResponse>>>(
      this.apiUrl,
      { params }
    );
  }

  /**
   * Obtiene el detalle completo de un anticipo por ID
   */
  getById(id: number): Observable<ApiListResponse<AnticipoDetalleResponse>> {
    return this.http.get<ApiListResponse<AnticipoDetalleResponse>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Busca anticipos por cliente (helper method)
   */
  getByCliente(clientesCodigo: number, page: number = 1, pageSize: number = 10): Observable<ApiListResponse<PaginationResponse<AnticipoResponse>>> {
    return this.getAll({
      clientesCodigo,
      page,
      pageSize
    });
  }

  /**
   * Busca anticipos activos (no cancelados) por cliente
   */
  getActivosByCliente(clientesCodigo: number, page: number = 1, pageSize: number = 10): Observable<ApiListResponse<PaginationResponse<AnticipoResponse>>> {
    return this.getAll({
      clientesCodigo,
      cancelado: false,
      estado: true,
      page,
      pageSize
    });
  }

  /**
   * Busca anticipos disponibles (no utilizados, no cancelados)
   */
  getDisponibles(page: number = 1, pageSize: number = 10): Observable<ApiListResponse<PaginationResponse<AnticipoResponse>>> {
    return this.getAll({
      cancelado: false,
      utilizado: false,
      estado: true,
      page,
      pageSize
    });
  }
  /**
 * Obtiene el siguiente número de anticipo
 */
  getNextNumero(): Observable<ApiListResponse<SiguienteIdAntiicpo>> {
    return this.http.get<ApiListResponse<SiguienteIdAntiicpo>>(
      `${this.apiUrl}/nextid`
    );
  }

    /**
   * Anula un anticipo existente
   */
  anular(request: AnularAnticipoRequest): Observable<ApiListResponse<AnticipoDetalleResponse>> {
    return this.http.put<ApiListResponse<AnticipoDetalleResponse>>(
      `${this.apiUrl}/anular`,
      request
    );
  }
  /**
   * Obtiene el reporte de anticipos con filtros y paginación
   * @param request Parámetros del reporte
   * @returns Observable con la respuesta paginada
   */
  getReporteAnticipos(
    request: ReporteAnticipoRequest
  ): Observable<ApiListResponse<ReporteAnticiposResponse>> {  // ✅ CAMBIO AQUÍ
    const url = `${this.apiUrl}/reporte`;

    let params = new HttpParams()
      .set('fechaInicial', request.fechaInicial)
      .set('fechaFinal', request.fechaFinal)
      .set('estadoFiltro', request.estadoFiltro.toString())
      .set('page', request.page.toString())
      .set('pageSize', request.pageSize.toString());

    if (request.idTipoAnticipo != null) {
      params = params.set('idTipoAnticipo', request.idTipoAnticipo.toString());
    }

    console.log('[AnticipoService] GET Reporte', url, { params: request });

    return this.http.get<ApiListResponse<ReporteAnticiposResponse>>(url, { params }).pipe(
      map(response => {
        console.log('[AnticipoService] Reporte OK:', response);
        return response;
      }),
      catchError(error => {
        console.error('[AnticipoService] Error en reporte:', error);
        return of({
          id: '',
          type: 'Error',
          data: {
            datos: {
              items: [],
              page: request.page,
              pageSize: request.pageSize,
              totalItems: 0,
              totalPages: 0,
              message: 'Error al obtener el reporte'
            },
            totales: {
              total_monto_inicial: 0,
              total_monto_utilizado: 0,
              total_saldo: 0
            }
          },
          message: error.message || 'Error al obtener el reporte de anticipos',
          count: 0
        } as ApiListResponse<ReporteAnticiposResponse>);
      })
    );
  }
  /**
 * Obtiene el desglose completo de uso de un anticipo específico
 * Muestra dónde se ha utilizado el anticipo (facturas y pagos)
 * @param idAnticipo ID del anticipo
 * @returns Observable con el desglose del anticipo
 */
  getDesglose(idAnticipo: number): Observable<ApiListResponse<DesgloceAnticipoResponse>> {
    const url = `${this.apiUrl}/desglose/${idAnticipo}`;

    console.log('[AnticipoService] GET Desglose', url, { idAnticipo });

    return this.http.get<ApiListResponse<DesgloceAnticipoResponse>>(url).pipe(
      map(response => {
        console.log('[AnticipoService] Desglose OK:', response);
        return response;
      })
    );
  }
  /**
   * Helper: Convierte Date a formato ISO string (YYYY-MM-DD)
   */
  formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
