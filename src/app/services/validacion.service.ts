import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { UpdateClienteRequest } from '../interfaces/requests/update-cliente-request';
import { ClienteLicenseResponse } from '../interfaces/responses/cliente-license-response';


export interface ClienteLicenseQuery {
  nombreCliente?: string;
  codigoPrefijo?: string;
  fechaDesde?: string; // formato YYYY-MM-DD
  fechaHasta?: string; // formato YYYY-MM-DD
  fechaIgual?: string; // formato YYYY-MM-DD
  ruc?: string;
  estadoPrefijo?: boolean;
  estadoEmpresa?: number;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ValidacionService {
  private baseUrl = environment.validationUrl; // Ajusta la URL base

  constructor(private http: HttpClient) {}

  updateCliente(idCliente: number, request: UpdateClienteRequest): Observable<ApiListResponse<boolean>> {
    return this.http.put<ApiListResponse<boolean>>(`${this.baseUrl}/Clientes/validacion/${idCliente}`, request);
  }

  /**
   * Obtiene las licencias de clientes con filtros opcionales
   * @param query Parámetros de búsqueda y filtros
   * @returns Observable con la respuesta paginada de licencias
   */
  getClientesLicense(query?: ClienteLicenseQuery): Observable<ApiResponse<PaginationResponse<ClienteLicenseResponse>>> {
    let params = new HttpParams();
    
    if (query) {
      // Agregar parámetros solo si tienen valor
      if (query.nombreCliente) {
        params = params.set('nombreCliente', query.nombreCliente);
      }
      if (query.codigoPrefijo) {
        params = params.set('codigoPrefijo', query.codigoPrefijo);
      }
      if (query.fechaDesde) {
        params = params.set('fechaDesde', query.fechaDesde);
      }
      if (query.fechaHasta) {
        params = params.set('fechaHasta', query.fechaHasta);
      }
      if (query.fechaIgual) {
        params = params.set('fechaIgual', query.fechaIgual);
      }
      if (query.ruc) {
        params = params.set('ruc', query.ruc);
      }
      if (query.estadoPrefijo !== undefined) {
        params = params.set('estadoPrefijo', query.estadoPrefijo.toString());
      }
      if (query.estadoEmpresa !== undefined) {
        params = params.set('estadoEmpresa', query.estadoEmpresa.toString());
      }
      if (query.pageNumber) {
        params = params.set('pageNumber', query.pageNumber.toString());
      }
      if (query.pageSize) {
        params = params.set('pageSize', query.pageSize.toString());
      }
    }

    return this.http.get<ApiResponse<PaginationResponse<ClienteLicenseResponse>>>(
      `${this.baseUrl}/Clientes/licenses`, 
      { params }
    );
  }

  /**
   * Método helper para obtener licencias con parámetros individuales (alternativa más simple)
   */
  getClientesLicenseSimple(
    nombreCliente?: string,
    codigoPrefijo?: string,
    fechaDesde?: string,
    fechaHasta?: string,
    fechaIgual?: string,
    ruc?: string,
    estadoPrefijo?: boolean,
    estadoEmpresa?: number,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Observable<ApiResponse<PaginationResponse<ClienteLicenseResponse>>> {
    const query: ClienteLicenseQuery = {
      nombreCliente,
      codigoPrefijo,
      fechaDesde,
      fechaHasta,
      fechaIgual,
      ruc,
      estadoPrefijo,
      estadoEmpresa,
      pageNumber,
      pageSize
    };

    return this.getClientesLicense(query);
  }
}