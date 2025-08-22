import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: 'Success' | 'Error' | 'NotFound' | string;
  data: T;
  message: string;
  count: number;
}

export interface ProductoResponse {
  id_producto: number;
  codpro: string | null;
  despro: string | null;
  tippro: string | null;
  preven: number | null;
  precos: number | null;
  stock_min: number | null;
  stock_max: number | null;
  uniman: string | null;
  clas_prod: string | null;
  activo: boolean | null;
  codbar: string | null;
  prevensiniva: number | null;
  id_empresa: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private baseUrl = environment.invoices_sic; // ej: http://localhost:5000

  constructor(private http: HttpClient) {}

  /**
   * GET /api/producto/by-codpro-fixed
   * Retorna productos con Codpro IN ('1174','1175','1176','1177','1178','1180')
   */
  getProductosCodproFijos(): Observable<ProductoResponse[]> {
    const url = `${this.baseUrl}/producto/by-codpro-fixed`;
      return this.http.get<ApiResponse<ProductoResponse[]>>(url).pipe(
      map(resp => {
        if (resp.type !== 'Success') {
          throw new Error(resp.message || 'Error al obtener productos');
        }
        return resp.data ?? [];
      }),
      catchError(err => {
        console.error('[FacturacionService] getProductosCodproFijos error:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * GET /api/producto/by-codpro?codigos=1174&codigos=1175...
   * (Usa este si agregas el endpoint parametrizable en tu backend)
   */
  getProductosPorCodigos(codigos: string[]): Observable<ProductoResponse[]> {
    const url = `${this.baseUrl}/producto/by-codpro`;
    let params = new HttpParams();
    codigos.forEach(c => params = params.append('codigos', c));

    return this.http.get<ApiResponse<ProductoResponse[]>>(url, { params }).pipe(
      map(resp => {
        if (resp.type !== 'Success') {
          throw new Error(resp.message || 'Error al obtener productos');
        }
        return resp.data ?? [];
      }),
      catchError(err => {
        console.error('[FacturacionService] getProductosPorCodigos error:', err);
        return throwError(() => err);
      })
    );
  }
}
