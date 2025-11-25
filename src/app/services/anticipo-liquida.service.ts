import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnticipoLiquidaResponse, NextNumeroLiquidacionResponse } from '../interfaces/responses/anticipo-liquida-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { LiquidarAnticipoRequest } from '../interfaces/requests/anticipo-liquida-request';
import { ApiResponse } from '../interfaces/responses/api-response';

export interface LiquidacionFilters {
  page?: number;
  pageSize?: number;
  clientesCodigo?: number;
  nombreCliente?: string;
  numLiquidacion?: number;
  fechaDesde?: string; // formato: 'YYYY-MM-DD'
  fechaHasta?: string; // formato: 'YYYY-MM-DD'
}

@Injectable({
  providedIn: 'root'
})
export class AnticipoLiquidaService {
  private apiUrl = `${environment.invoices_sic}/AnticipoLiquida`;

  constructor(private http: HttpClient) {}

  /**
   * Liquida un anticipo (devuelve/aplica el saldo)
   */
  liquidar(request: LiquidarAnticipoRequest): Observable<ApiResponse<AnticipoLiquidaResponse>> {
    return this.http.post<ApiResponse<AnticipoLiquidaResponse>>(
      `${this.apiUrl}/liquidar`,
      request
    );
  }
  /**
   * Obtiene el siguiente número de liquidación disponible
   */
  getNextNumero(): Observable<ApiResponse<NextNumeroLiquidacionResponse>> {
    return this.http.get<ApiResponse<NextNumeroLiquidacionResponse>>(
      `${this.apiUrl}/next-numero`
    );
  }
  /**
   * Obtiene todas las liquidaciones con filtros y paginación
   */
  getAll(filters?: LiquidacionFilters): Observable<ApiResponse<PaginationResponse<AnticipoLiquidaResponse>>> {
    let params = new HttpParams();

    // Paginación (valores por defecto)
    params = params.set('page', (filters?.page || 1).toString());
    params = params.set('pageSize', (filters?.pageSize || 10).toString());

    // Filtros opcionales
    if (filters?.clientesCodigo) {
      params = params.set('clientesCodigo', filters.clientesCodigo.toString());
    }
    if (filters?.nombreCliente) {
      params = params.set('nombreCliente', filters.nombreCliente);
    }
    if (filters?.numLiquidacion) {
      params = params.set('numLiquidacion', filters.numLiquidacion.toString());
    }

    if (filters?.fechaDesde) {
      params = params.set('fechaDesde', filters.fechaDesde);
    }

    if (filters?.fechaHasta) {
      params = params.set('fechaHasta', filters.fechaHasta);
    }

    return this.http.get<ApiResponse<PaginationResponse<AnticipoLiquidaResponse>>>(
      this.apiUrl,
      { params }
    );
  }

  /**
   * Obtiene las liquidaciones de un anticipo específico
   */
  getByAnticipo(
    idAnticipo: number,
    page: number = 1,
    pageSize: number = 10
  ): Observable<ApiResponse<PaginationResponse<AnticipoLiquidaResponse>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginationResponse<AnticipoLiquidaResponse>>>(
      `${this.apiUrl}/anticipo/${idAnticipo}`,
      { params }
    );
  }

  /**
   * Obtiene el detalle de una liquidación específica
   */
  getById(id: number): Observable<ApiResponse<AnticipoLiquidaResponse>> {
    return this.http.get<ApiResponse<AnticipoLiquidaResponse>>(
      `${this.apiUrl}/${id}`
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
