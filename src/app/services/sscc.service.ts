import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { SsccResponse } from '../interfaces/responses/sscc-response';
import { SsccRequest } from '../interfaces/requests/sscc-request';
import { GenerateSsccRequest } from '../interfaces/requests/generate-sscc-request';

@Injectable({
  providedIn: 'root'
})
export class SsccService {
  private apiUrl = `${environment.clientsUrl}/Sscc`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<SsccResponse[]>> {
    return this.http.get<ApiResponse<SsccResponse[]>>(`${this.apiUrl}`);
  }

  getById(id: number): Observable<ApiResponse<SsccResponse>> {
    return this.http.get<ApiResponse<SsccResponse>>(`${this.apiUrl}/${id}`);
  }

  getByPrefijo(idPrefijo: number, page: number = 1, pageSize: number = 50): Observable<ApiResponse<PaginationResponse<SsccResponse>>> {
    const params = new HttpParams()
      .set('idPrefijo', idPrefijo.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginationResponse<SsccResponse>>>(`${this.apiUrl}/por-prefijo`, { params });
  }

  getByCliente(idCliente: number, page: number = 1, pageSize: number = 50): Observable<ApiResponse<PaginationResponse<SsccResponse>>> {
    const params = new HttpParams()
      .set('idCliente', idCliente.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginationResponse<SsccResponse>>>(`${this.apiUrl}/por-cliente`, { params });
  }

  create(request: SsccRequest): Observable<ApiResponse<SsccResponse>> {
    return this.http.post<ApiResponse<SsccResponse>>(`${this.apiUrl}`, request);
  }
  /**
   * Actualizar solo el estado de un SSCC
   */
  updateStatus(id: number, estado: boolean): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}/status`, estado);
  }
  
  generate(request: GenerateSsccRequest): Observable<ApiResponse<string[]>> {
    return this.http.post<ApiResponse<string[]>>(`${this.apiUrl}/generar`, request);
  }

  deleteMultiple(payload: { ids: number[]; observacion: string; usuario: number }): Observable<ApiResponse<any>> {
    return this.http.request<ApiResponse<any>>('DELETE', `${this.apiUrl}/eliminar`, {
      body: payload
    });
  }

  getByNumeroSscc(numeroSscc: string): Observable<ApiResponse<SsccResponse>> {
    const params = new HttpParams().set('numeroSscc', numeroSscc);
    return this.http.get<ApiResponse<SsccResponse>>(`${this.apiUrl}/por-numero`, { params });
  }

  //Servicio para filtrar todos los sscc con el filtro especifico en vez de hacerlo en el front
  getByClienteConFiltros(
    idCliente: number,
    filtros: {
      page: number;
      pageSize: number;
      idPrefijo?: number;
      busqueda?: string;
      empaque?: string;
      serialDesde?: number;
      serialHasta?: number;
      estado?: boolean;
      fechaDesde?: string;
      fechaHasta?: string;
    }
  ): Observable<ApiResponse<PaginationResponse<SsccResponse>>> {
    let params = new HttpParams()
      .set('page', filtros.page.toString())
      .set('pageSize', filtros.pageSize.toString());

    if (filtros.idPrefijo !== undefined) {
      params = params.set('idPrefijo', filtros.idPrefijo.toString());
    }

    if (filtros.busqueda) {
      params = params.set('busqueda', filtros.busqueda);
    }

    if (filtros.empaque) {
      params = params.set('empaque', filtros.empaque);
    }

    if (filtros.serialDesde !== undefined) {
      params = params.set('serialDesde', filtros.serialDesde.toString());
    }

    if (filtros.serialHasta !== undefined) {
      params = params.set('serialHasta', filtros.serialHasta.toString());
    }

    if (filtros.estado !== undefined) {
      params = params.set('estado', filtros.estado.toString());
    }

    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }

    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }

    return this.http.get<ApiResponse<PaginationResponse<SsccResponse>>>(
      `${this.apiUrl}/cliente/${idCliente}/filtros`,
      { params }
    );
  }

  getReporte(filtros: {
    idPrefijo?: number;
    estado?: boolean;
    operadorFecha?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<ApiResponse<SsccResponse[]>> {
    let params = new HttpParams();

    if (filtros.idPrefijo !== undefined) {
      params = params.set('idPrefijo', filtros.idPrefijo.toString());
    }

    if (filtros.estado !== undefined) {
      params = params.set('estado', filtros.estado.toString());
    }

    if (filtros.operadorFecha) {
      params = params.set('operadorFecha', filtros.operadorFecha);
    }

    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }

    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }

    return this.http.get<ApiResponse<SsccResponse[]>>(`${this.apiUrl}/reporte`, { params });
  }

  /**
 * Obtener todos los SSCC por ID de prefijo (sin paginación)
 */
getTodosPorIdPrefijo(idPrefijo: number): Observable<ApiResponse<SsccResponse[]>> {
  const params = new HttpParams().set('idPrefijo', idPrefijo.toString());
  return this.http.get<ApiResponse<SsccResponse[]>>(`${this.apiUrl}/id-prefijo`, { params });
}

/**
 * Actualiza el ID del cliente en todos los SSCC relacionados con un ID de prefijo
 */
actualizarClientePorPrefijo(idPrefijo: number, nuevoIdCliente: number): Observable<ApiResponse<boolean>> {
  const payload = {
    idPrefijo,
    nuevoIdCliente
  };

  return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/actualizar-idprefijo`, payload);
}


}
