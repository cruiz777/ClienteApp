// autorizacion-caja.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AutorizacionCajaService {
  private apiBaseUrl = environment.invoices_sic; 
  

  constructor(private http: HttpClient) {}

  /** ✅ Versión estándar (el API devuelve application/json) */
  getAutorizacionCaja(id: number): Observable<ApiResponse<AutorizacionCaja>> {
    return this.http
      .get<ApiResponse<AutorizacionCaja>>(`${this.apiBaseUrl}/AutorizacionCaja/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** ✅ Versión alternativa si el API obliga Accept: text/plain y responde texto */
  getAutorizacionCajaText(id: number): Observable<ApiResponse<AutorizacionCaja>> {
    const headers = new HttpHeaders({ Accept: 'text/plain' });
    return this.http
      .get(`${this.apiBaseUrl}/AutorizacionCaja/${id}`, { headers, responseType: 'text' })
      .pipe(
        map(t => JSON.parse(t) as ApiResponse<AutorizacionCaja>),
        catchError(this.handleError)
      );
  }

  private handleError(err: any) {
    console.error('AutorizacionCaja error', err);
    return throwError(() => err);
  }
}

/* ==== Modelos opcionales para tipado fuerte ==== */
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number | null;
}

export interface AutorizacionCaja {
  id_autorizacion_caja: number;
  caja: string;
  numero_autorizacion: string;
  docini: number;
  docfin: number;
  fecini: string;  // ISO
  fecfin: string;  // ISO
  doc_sri: number;
  numero_factura: string;
  estado_factura: string;
  num_establecimiento: string;
  id_local: number;
  direccion: string;
  ruc: string;
  nombre_comercial: string;
  id_empresa: number;
  generar_xml: boolean;
  id_tipo_documento: number;
}
