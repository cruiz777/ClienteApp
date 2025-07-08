import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { CuponResponse } from '../interfaces/responses/cupon-response';
import { CuponRequest } from '../interfaces/requests/cupon-request';
import { DeleteCuponRequest } from '../interfaces/requests/delete-cupon-request';
import { CreateCuponResponse } from '../interfaces/responses/create-cupon.response';

@Injectable({ providedIn: 'root' })
export class CuponService {
  private apiUrl = `${environment.clientsUrl}/Cupones`;

  constructor(private http: HttpClient) { }

  getByCliente(idCliente: number, page = 1, pageSize = 50): Observable<ApiResponse<PaginationResponse<CuponResponse>>> {
    const params = new HttpParams()
      .set('idCliente', idCliente.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginationResponse<CuponResponse>>>(`${this.apiUrl}/por-cliente`, { params });
  }

  getByClienteVigentes(idCliente: number, page = 1, pageSize = 50): Observable<ApiResponse<PaginationResponse<CuponResponse>>> {
    const params = new HttpParams()
      .set('idCliente', idCliente.toString())
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginationResponse<CuponResponse>>>(`${this.apiUrl}/por-cliente/vigentes`, { params });
  }

  buscarCupones(filtros: {
    idCliente?: number;
    idPrefijo?: number;
    serial?: number;
    busqueda?: string;
    estado?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<ApiResponse<PaginationResponse<CuponResponse>>> {
    let params = new HttpParams();

    if (filtros.idCliente !== undefined) params = params.set('idCliente', filtros.idCliente);
    if (filtros.idPrefijo !== undefined) params = params.set('idPrefijo', filtros.idPrefijo);
    if (filtros.serial !== undefined) params = params.set('serial', filtros.serial);
    if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    if (filtros.estado !== undefined) params = params.set('estado', filtros.estado);
    if (filtros.page !== undefined) params = params.set('page', filtros.page);
    if (filtros.pageSize !== undefined) params = params.set('pageSize', filtros.pageSize);

    return this.http.get<ApiResponse<PaginationResponse<CuponResponse>>>(`${this.apiUrl}/buscar`, { params });
  }

  create(request: CuponRequest): Observable<ApiResponse<CreateCuponResponse>> {
    return this.http.post<ApiResponse<CreateCuponResponse>>(`${this.apiUrl}`, request);
  }

  updateEstado(id: number, estado: boolean): Observable<ApiResponse<boolean>> {
    const body = { estado };
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/estado`, body);
  }

  deleteMultiple(request: DeleteCuponRequest): Observable<ApiResponse<any>> {
    return this.http.request<ApiResponse<any>>('DELETE', `${this.apiUrl}/eliminar`, { body: request });
  }
  getReporte(filtros: {
    idPrefijo?: number;
    estado?: boolean;
    operadorFecha?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<ApiResponse<CuponResponse[]>> {
    let params = new HttpParams();

    // ✅ Orden exacto que funciona en Swagger
    if (filtros.idPrefijo !== undefined) {
      params = params.set('idPrefijo', filtros.idPrefijo.toString());
    }

    if (filtros.estado !== undefined) {
      params = params.set('estado', filtros.estado.toString());
    }

    // ✅ operadorFecha ANTES de las fechas
    if (filtros.operadorFecha) {
      params = params.set('operadorFecha', filtros.operadorFecha);
    }

    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }

    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }

    // ✅ Debug: mostrar la URL final
    const finalUrl = `${this.apiUrl}/reporte?${params.toString()}`;
    console.log('URL generada por el frontend:', finalUrl);

    return this.http.get<ApiResponse<CuponResponse[]>>(`${this.apiUrl}/reporte`, { params });
  }
  getByPrefijo(idPrefijo: number): Observable<ApiResponse<CuponResponse[]>> {
    const params = new HttpParams().set('idPrefijo', idPrefijo.toString());
    return this.http.get<ApiResponse<CuponResponse[]>>(`${this.apiUrl}/por-prefijo`, { params });
  }

  /**
   * Actualiza el ID del cliente en todos los cupones relacionados con un ID de prefijo
   */
  actualizarClientePorPrefijo(idPrefijo: number, nuevoIdCliente: number): Observable<ApiResponse<boolean>> {
    const payload = {
      idPrefijo,
      nuevoIdCliente
    };

    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/actualizar-idcliente-por-idprefijo`, payload);
  }

}
