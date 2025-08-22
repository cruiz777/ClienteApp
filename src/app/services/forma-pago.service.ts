import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;     // "Success" | "Error"
  data: T;
  message: string;
}

export interface FormaPagoResponse {
  idFormaPago: number;
  descripcionPago: string;
}

@Injectable({ providedIn: 'root' })
export class FormaPagoService {
  private baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  /**
   * Busca formas de pago por descripción (LIKE %term%)
   */
  search(term: string): Observable<ApiResponse<FormaPagoResponse[]>> {
    const url = `${this.baseUrl}/FormaPago/search`;
    const params = new HttpParams().set('term', term ?? '');

    console.log('[FormaPagoService] GET', url, 'params =', { term });

    return this.http.get<ApiResponse<FormaPagoResponse[]>>(url, { params }).pipe(
      tap(resp => console.log('[FormaPagoService] OK resp =', resp)),
      catchError(err => {
        console.error('[FormaPagoService] ERROR =', err);
        // Devuelve estructura vacía para no romper el flujo del componente
        return of({
          id: '',
          type: 'Error',
          data: [] as FormaPagoResponse[],
          message: 'Error en búsqueda de formas de pago'
        } as ApiResponse<FormaPagoResponse[]>);
      })
    );
  }
}
