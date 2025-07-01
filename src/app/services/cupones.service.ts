import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { PaginationResponse } from '../interfaces/responses/pagination-response';
import { CuponResponse } from '../interfaces/responses/cupon-response';
import { CuponRequest } from '../interfaces/requests/cupon-request';
import { DeleteCuponRequest } from '../interfaces/requests/delete-cupon-request';

@Injectable({ providedIn: 'root' })
export class CuponService {
  private apiUrl = `${environment.clientsUrl}/Cupones`;

  constructor(private http: HttpClient) {}

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
    codigoCupon?: string;
    estado?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<ApiResponse<PaginationResponse<CuponResponse>>> {
    let params = new HttpParams();

    if (filtros.idCliente !== undefined) params = params.set('idCliente', filtros.idCliente);
    if (filtros.idPrefijo !== undefined) params = params.set('idPrefijo', filtros.idPrefijo);
    if (filtros.serial !== undefined) params = params.set('serial', filtros.serial);
    if (filtros.codigoCupon) params = params.set('codigoCupon', filtros.codigoCupon);
    if (filtros.estado !== undefined) params = params.set('estado', filtros.estado);
    if (filtros.page !== undefined) params = params.set('page', filtros.page);
    if (filtros.pageSize !== undefined) params = params.set('pageSize', filtros.pageSize);

    return this.http.get<ApiResponse<PaginationResponse<CuponResponse>>>(`${this.apiUrl}/buscar`, { params });
  }

 create(request: CuponRequest): Observable<ApiResponse<string[]>> {
  return this.http.post<ApiResponse<string[]>>(`${this.apiUrl}`, request);
}

  deleteMultiple(request: DeleteCuponRequest): Observable<ApiResponse<any>> {
    return this.http.request<ApiResponse<any>>('DELETE', `${this.apiUrl}/eliminar`, { body: request });
  }
}
