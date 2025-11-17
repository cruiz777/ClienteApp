import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
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
  codigoCuenta?: string;   // <- opcional
}

/** Estructura de datos paginados que devuelve tu API */
export interface PagedData<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message: string;
}

/** DTO crudo del backend (snake_case). Lo usamos solo para recibir. */
interface FormaPagoDto {
  id_forma_pago: number;
  descripcion_pago: string;
  // Otros campos vienen en la respuesta pero no los usamos aquí
}

@Injectable({ providedIn: 'root' })
export class FormaPagoService {
  private baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  /** Helper: mapea DTO -> modelo ligero del front */
  private mapDtoToLite = (x: FormaPagoDto): FormaPagoResponse => ({
    idFormaPago: x.id_forma_pago,
    descripcionPago: x.descripcion_pago
  });

  /**
   * Busca formas de pago por descripción (LIKE %term%)
   * Endpoint esperado: GET {baseUrl}/FormaPago/search?term=...
   * Retorna directamente tu modelo ligero (array).
   */
 // forma-pago.service.ts
search(term: string): Observable<ApiResponse<FormaPagoResponse[]>> {
  const url = `${this.baseUrl}/FormaPago/search`;
  const params = new HttpParams().set('term', term ?? '');

  return this.http.get<ApiResponse<any[]>>(url, { params }).pipe(
    map(resp => ({
      ...resp,
      data: (resp.data ?? []).map(d => ({
        idFormaPago: d.id_forma_pago,
        descripcionPago: d.descripcion_pago,
        codigoCuenta: d.codigo_cuenta,
      }))
    })),
    catchError(() => of({ id:'', type:'Error', data:[], message:'Error' }))
  );
}


  /**
   * Obtiene formas de pago activas (modelo ligero).
   * Endpoint esperado: GET {baseUrl}/FormaPago/activas
   */
  getActivas(): Observable<ApiResponse<FormaPagoResponse[]>> {
    const url = `${this.baseUrl}/FormaPago/activas`;

    console.log('[FormaPagoService] GET', url);

    return this.http.get<ApiResponse<FormaPagoResponse[]>>(url).pipe(
      tap(resp => console.log('[FormaPagoService] OK resp =', resp)),
      catchError(err => {
        console.error('[FormaPagoService] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: [] as FormaPagoResponse[],
          message: 'Error al obtener formas de pago activas'
        } as ApiResponse<FormaPagoResponse[]>);
      })
    );
  }

  /**
   * Lista paginada desde {baseUrl}/FormaPago?page=1&pageSize=10
   * Mapea los items del DTO crudo (snake_case) a tu modelo ligero (camelCase).
   */
  getPagedLite(page = 1, pageSize = 10): Observable<ApiResponse<PagedData<FormaPagoResponse>>> {
    const url = `${this.baseUrl}/FormaPago`;
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    console.log('[FormaPagoService] GET', url, 'params =', { page, pageSize });

    return this.http.get<ApiResponse<PagedData<FormaPagoDto>>>(url, { params }).pipe(
      tap(resp => console.log('[FormaPagoService] OK resp =', resp)),
      map(resp => {
        if (resp.type !== 'Success') {
          // Mantiene la forma del contrato aunque el backend informe Error
          return {
            id: resp.id,
            type: 'Error',
            message: resp.message || 'Error al obtener formas de pago paginadas',
            data: {
              items: [] as FormaPagoResponse[],
              page,
              pageSize,
              totalItems: 0,
              totalPages: 0,
              message: resp.data?.message ?? ''
            }
          } as ApiResponse<PagedData<FormaPagoResponse>>;
        }

        // Transformación a modelo ligero
        const mapped: PagedData<FormaPagoResponse> = {
          ...resp.data,
          items: resp.data.items.map(this.mapDtoToLite)
        };

        return {
          ...resp,
          data: mapped
        } as ApiResponse<PagedData<FormaPagoResponse>>;
      }),
      catchError(err => {
        console.error('[FormaPagoService] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: {
            items: [],
            page,
            pageSize,
            totalItems: 0,
            totalPages: 0,
            message: 'Error al obtener formas de pago'
          },
          message: 'Error al obtener formas de pago paginadas'
        } as ApiResponse<PagedData<FormaPagoResponse>>);
      })
    );
  }
    /**
   * Obtiene formas de pago con ActivarAnticipo activo (modelo ligero).
   * Endpoint esperado: GET {baseUrl}/FormaPago/anticipo-activas
   */
  getAnticipoActivas(): Observable<ApiResponse<FormaPagoResponse[]>> {
    const url = `${this.baseUrl}/FormaPago/anticipo-activas`;

    console.log('[FormaPagoService] GET', url);

    return this.http.get<ApiResponse<FormaPagoResponse[]>>(url).pipe(
      tap(resp => console.log('[FormaPagoService] OK resp =', resp)),
      catchError(err => {
        console.error('[FormaPagoService] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: [] as FormaPagoResponse[],
          message: 'Error al obtener formas de pago con anticipo activo'
        } as ApiResponse<FormaPagoResponse[]>);
      })
    );
  }
}
