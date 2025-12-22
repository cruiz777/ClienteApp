import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { BalanceDiarioResponse } from '../interfaces/responses/balance-diario-response';

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

}
