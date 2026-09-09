import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T | null;
  message: string | null;
  count: number;
}

export interface DashboardMensual {
  mesNumero: number;
  mes: string;
  individual: number;
  industrial: number;
  total: number;
}

export interface DashboardFacturacionResponse {
  anio: number;
  totalFacturacion: number;
  totalIndividual: number;
  totalIndustrial: number;
  meses: DashboardMensual[];
}

export interface DashboardPagosResponse {
  anio: number;
  totalCobrado: number;
  totalIndividual: number;
  totalIndustrial: number;
  meses: DashboardMensual[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardFacturacionService {
  private readonly baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  getDashboardFacturacion(anio?: number): Observable<DashboardFacturacionResponse> {
    let params = new HttpParams();

    if (anio) {
      params = params.set('anio', anio.toString());
    }

    return this.http
      .get<ApiResponse<DashboardFacturacionResponse>>(
        `${this.baseUrl}/Facturacion/dashboard-facturacion`,
        { params }
      )
      .pipe(
        map(res => {
          if (!res.data) {
            throw new Error(res.message || 'No se recibió información del dashboard de facturación');
          }

          return res.data;
        })
      );
  }

  getDashboardPagos(anio?: number): Observable<DashboardPagosResponse> {
    let params = new HttpParams();

    if (anio) {
      params = params.set('anio', anio.toString());
    }

    return this.http
      .get<ApiResponse<DashboardPagosResponse>>(
        `${this.baseUrl}/Facturacion/dashboard-pagos`,
        { params }
      )
      .pipe(
        map(res => {
          if (!res.data) {
            throw new Error(res.message || 'No se recibió información del dashboard de pagos');
          }

          return res.data;
        })
      );
  }
}