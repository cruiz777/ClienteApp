// src/app/services/anticipo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateAnticipoRequest } from '../interfaces/requests/anticipo-request';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { AnticipoResponse, AnticipoDetalleResponse } from '../interfaces/responses/anticipo-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';

export interface AnticipoFilters {
  page?: number;
  pageSize?: number;
  clientesCodigo?: number;
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
    if (filters?.clientesCodigo) {
      params = params.set('clientesCodigo', filters.clientesCodigo.toString());
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
}
