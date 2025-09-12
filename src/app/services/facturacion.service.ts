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
export interface GenerarXmlFacturaResponse {
  success: boolean;
  message: string;
  fileName?: string;
  savedPath?: string;
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

export interface FacturaDetalleRequest {
  idProducto: number;
  cantidad: number;
  precio: number;
  idDescuentoPredeterminado: number | null; // ← permite null
  porcentajeDescuentoManual: number | null; // ← permite null
  nombreProductoPersonalizado: string
  ivaCalculado: number;
  subtotalCalculado: number;
  descuentoCalculado: number;
  totalCalculado: number;
  codigoPrefijo: string;
  periodoDesde: string;
  periodoHasta: string;
}

export interface FacturaCrearRequest {
  idCliente: number;
  caja: string;
  idUsuarioCajero: number;
  idDescuentoGlobal: number | null;          // ← permite null
  porcentajeDescuentoGlobal: number | null;  // ← permite null
  observaciones: string;
  anioFactura: number;
  numeroOrdenCompra: string,
  numeroGuiaRemision: string,
  prefijo: string;
  correo: string;
  subtotalSIva: number,
  subtotalCalculado: number,
  descuentoTotalCalculado: number,
  ivaTotalCalculado: number,
  totalCalculado: number,
  detalles: FacturaDetalleRequest[];
  formasPago: FacturaFormaPagoRequest[];
}


export interface FacturaFormaPagoRequest {
  idFormaPago: number;
  valor: number;
  referencia: string;
  observaciones: string;
  codPlazo: string;
  banco: string;
  numeroTarjeta: string;
  chequeCaduca: string;
  duenio: string;
  autoriza: string;
}



export interface ApiResponse<T = any> {
  type: string;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private baseUrl = environment.invoices_sic; // ej: http://localhost:5000

  constructor(private http: HttpClient) { }

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
  crear(payload: FacturaCrearRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/Facturacion/crear`, payload);
  }
  /** GET /api/Facturacion/{idNota}/xml  → XML como string */
  getXmlFactura(idNota: number): Observable<string> {
    const url = `${this.baseUrl}/api/Facturacion/${idNota}/xml`; // ajusta /api si tu backend no lo usa
    return this.http.get(url, { responseType: 'text' }).pipe(
      catchError(err => {
        console.error('[FacturacionService] getXmlFactura error:', err);
        return throwError(() => err);
      })
    );
  }

  /** GET /api/Facturacion/{idNota}/xml  → XML como Blob (para descargar) */
  getXmlFacturaBlob(idNota: number): Observable<Blob> {
    const url = `${this.baseUrl}/Facturacion/${idNota}/xml`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError(err => {
        console.error('[FacturacionService] getXmlFacturaBlob error:', err);
        return throwError(() => err);
      })
    );
  }

  /** Helper para disparar la descarga inmediatamente */
  descargarXmlFactura(idNota: number, nombre = `factura-${idNota}.xml`): Observable<void> {
    return this.getXmlFacturaBlob(idNota).pipe(
      map(blob => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      })
    );
  }
generarXmlEnServidor(idNota: number) {
  // usa la ruta de tu controller:
  // si dejaste el endpoint en FacturacionController => /api/Facturacion/{idNota}/xml
  // si lo moviste a FacturaController         => /api/facturas/{idNota}/xml
  const url = `${this.baseUrl}/Facturacion/${idNota}/xml`; // o '/facturas/...'
  return this.http.post<GenerarXmlFacturaResponse>(url, {}); // POST y JSON
}

}
