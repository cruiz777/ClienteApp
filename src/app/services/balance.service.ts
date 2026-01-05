import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { BalanceComprobacionRequest } from '../interfaces/requests/balance-comprobacion-request';

import { BalanceDiarioResponse } from '../interfaces/responses/balance-diario-response';
import { BalanceComprobacionResponse } from '../interfaces/responses/balance-comprobacion-response';
import { MayorCuentasResponse } from '../interfaces/responses/mayor-cuentas-response';


// Si quieres tipar la respuesta genérica como en producto.service.ts
export interface ApiResponse<T> {
  type: string;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class BalanceService {

  private apiUrl = `${environment.balanceApiUrl}/Balance`;

  constructor(private http: HttpClient) { }

  getByCondicionBalanceDiario(
    desde: string,
    hasta: string,
    cuentaA?: string | null,
    cuentaB?: string | null,
    id?: number | null
  ): Observable<ApiResponse<BalanceDiarioResponse[]>> {

    // Normaliza valores para URL (evita undefined/null en la ruta)
    const ca = (cuentaA ?? '').trim() || '0';
    const cb = (cuentaB ?? '').trim() || '0';
    const tipo = (id ?? 0);

    return this.http.get<ApiResponse<BalanceDiarioResponse[]>>(
      `${this.apiUrl}/desde/${desde}/hasta/${hasta}/cuentaA/${ca}/cuentaB/${cb}/asiento/${tipo}`
    );
  }

  getByCondicionBalanceComprobacion(
    request: BalanceComprobacionRequest
  ): Observable<ApiResponse<BalanceComprobacionResponse[]>> {
    return this.http.post<ApiResponse<BalanceComprobacionResponse[]>>(
      `${this.apiUrl}/balance-comprobacion`,
      request
    );
  }

  getByCondicionMayorCuentas(
    request: BalanceComprobacionRequest
  ): Observable<ApiResponse<MayorCuentasResponse[]>> {
    return this.http.post<ApiResponse<MayorCuentasResponse[]>>(
      `${this.apiUrl}/mayor-cuentas`,
      request
    );
  }

}
