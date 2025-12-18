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
    hasta: string
  ): Observable<ApiResponse<BalanceDiarioResponse[]>> {

    return this.http.get<ApiResponse<BalanceDiarioResponse[]>>(
      `${this.apiUrl}/desde/${desde}/hasta/${hasta}`
    );
  }

}
