// src/app/services/forma-pago.service.ts
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

/** 🔹 Modelo que usas en el front (compatible con código existente) */
export interface FormaPagoResponse {
  // LO QUE YA TENÍAS
  idFormaPago: number;
  descripcionPago: string;
  codigo_cuenta?: string | null;
  id_plan?: number | null;

  // CAMPOS EXTRA (opcionales) PARA CRUD
  idClasificacion?: number;
  idFormaPagoSri?: number;

  activarFactura?: boolean;
  activarCuentas?: boolean;
  cxc?: boolean;
  activarFacturaHis?: boolean;
  activarLiqTarjeta?: boolean;
  activarPagTarjeta?: boolean;
  activarAnticipo?: boolean;

  codigocg?: string | null;
  codigosic?: string | null;

  idEmpresa?: number;
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

/** DTO crudo del backend (snake_case). */
interface FormaPagoDto {
  id_forma_pago: number;
  id_clasificacion: number;
  id_forma_pago_sri: number;
  descripcion_pago: string;
  codigo_cuenta: string | null;

  activar_factura: boolean;
  activar_cuentas: boolean;
  cxc: boolean;
  activar_factura_his: boolean;
  activar_liq_tarjeta: boolean;
  activar_pag_tarjeta: boolean;
  activar_anticipo: boolean;

  codigo_cg: string | null;
  codigo_sic: string | null;

  id_empresa: number;
  empresa_nombre: string;
  id_plan: number | null;
}

/** 🔹 Request POST /api/FormaPago */
export interface FormaPagoCreateRequest {
  idClasificacion: number;
  idFormaPagoSri: number;
  descripcionPago: string;
  codigoCuenta: string | null;

  activarFactura: boolean;
  activarCuentas: boolean;
  cxc: boolean;
  activarFacturaHis: boolean;
  activarLiqTarjeta: boolean;
  activarPagTarjeta: boolean;
  activarAnticipo: boolean;

  codigocg: string | null;
  codigosic: string | null;

  idEmpresa: number;
  idPlan: number | null;
}

/** 🔹 Request PUT /api/FormaPago/{id} */
export interface FormaPagoUpdateRequest extends FormaPagoCreateRequest {
  idFormaPago: number;
}

@Injectable({ providedIn: 'root' })
export class FormaPagoService {
  // Debe apuntar a: http://localhost:5010/invoices-sic/api
  private baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  /** 🔹 Helper: mapea DTO -> modelo del front */
  private mapDtoToLite = (x: FormaPagoDto): FormaPagoResponse => ({
    idFormaPago: x.id_forma_pago,
    descripcionPago: x.descripcion_pago,
    codigo_cuenta: x.codigo_cuenta,
    id_plan: x.id_plan,

    idClasificacion: x.id_clasificacion,
    idFormaPagoSri: x.id_forma_pago_sri,

    activarFactura: x.activar_factura,
    activarCuentas: x.activar_cuentas,
    cxc: x.cxc,
    activarFacturaHis: x.activar_factura_his,
    activarLiqTarjeta: x.activar_liq_tarjeta,
    activarPagTarjeta: x.activar_pag_tarjeta,
    activarAnticipo: x.activar_anticipo,

    codigocg: x.codigo_cg,
    codigosic: x.codigo_sic,

    idEmpresa: x.id_empresa
  });

  // =========================================================
  // 🔹 BÚSQUEDA SIMPLE (opcional, /FormaPago/search)
  // =========================================================
  search(term: string): Observable<ApiResponse<FormaPagoResponse[]>> {
    const url = `${this.baseUrl}/FormaPago/search`;
    const params = new HttpParams().set('term', term ?? '');

    return this.http.get<ApiResponse<FormaPagoDto[]>>(url, { params }).pipe(
      map(resp => ({
        ...resp,
        data: (resp.data ?? []).map(this.mapDtoToLite)
      })),
      catchError(err => {
        console.error('[FormaPagoService][search] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: [] as FormaPagoResponse[],
          message: 'Error al buscar formas de pago'
        } as ApiResponse<FormaPagoResponse[]>);
      })
    );
  }

  // =========================================================
  // 🔹 GET ACTIVAS (si existe /FormaPago/activas)
  // =========================================================
  getActivas(): Observable<ApiResponse<FormaPagoResponse[]>> {
    const url = `${this.baseUrl}/FormaPago/activas`;

    return this.http.get<ApiResponse<FormaPagoDto[]>>(url).pipe(
      map(resp => ({
        ...resp,
        data: (resp.data ?? []).map(this.mapDtoToLite)
      })),
      catchError(err => {
        console.error('[FormaPagoService][getActivas] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: [] as FormaPagoResponse[],
          message: 'Error al obtener formas de pago activas'
        } as ApiResponse<FormaPagoResponse[]>);
      })
    );
  }

  // =========================================================
  // 🔹 GET PARA FACTURA (filtrando activar_factura = true)
  // =========================================================
  getFacturaPago(page = 1, pageSize = 100): Observable<ApiResponse<FormaPagoResponse[]>> {
    const url = `${this.baseUrl}/FormaPago`;
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    return this.http.get<ApiResponse<PagedData<FormaPagoDto>>>(url, { params }).pipe(
      map(resp => {
        if (resp.type !== 'Success') {
          return {
            id: resp.id,
            type: 'Error',
            data: [] as FormaPagoResponse[],
            message: resp.message || 'Error al obtener formas de pago para factura'
          } as ApiResponse<FormaPagoResponse[]>;
        }

        const itemsFactura = (resp.data.items ?? [])
          .filter(x => x.activar_factura === true)
          .map(this.mapDtoToLite);

        return {
          id: resp.id,
          type: 'Success',
          data: itemsFactura,
          message: resp.message
        } as ApiResponse<FormaPagoResponse[]>;
      }),
      catchError(err => {
        console.error('[FormaPagoService][getFacturaPago] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: [] as FormaPagoResponse[],
          message: 'Error al obtener formas de pago para factura'
        } as ApiResponse<FormaPagoResponse[]>);
      })
    );
  }

  // =========================================================
  // 🔹 GET PAGINADO (para la grilla)
  // =========================================================
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

  // =========================================================
  // 🔹 GET ANTICIPO ACTIVAS (si existe /anticipo-activas)
  // =========================================================
  getAnticipoActivas(): Observable<ApiResponse<FormaPagoResponse[]>> {
    const url = `${this.baseUrl}/FormaPago/anticipo-activas`;

    console.log('[FormaPagoService][getAnticipoActivas] GET', url);

    return this.http.get<ApiResponse<FormaPagoDto[]>>(url).pipe(
      tap(resp => console.log('[FormaPagoService][getAnticipoActivas] OK resp =', resp)),
      map(resp => ({
        ...resp,
        data: (resp.data ?? []).map(this.mapDtoToLite)
      })),
      catchError(err => {
        console.error('[FormaPagoService][getAnticipoActivas] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: [] as FormaPagoResponse[],
          message: 'Error al obtener formas de pago con anticipo activo'
        } as ApiResponse<FormaPagoResponse[]>);
      })
    );
  }

  // =========================================================
  // 🔹 POST /api/FormaPago
  // =========================================================
  createFormaPago(payload: FormaPagoCreateRequest):
    Observable<ApiResponse<FormaPagoResponse>> {

    const url = `${this.baseUrl}/FormaPago`;
    console.log('[FormaPagoService][POST]', url, payload);

    return this.http.post<ApiResponse<FormaPagoDto>>(url, payload).pipe(
      map(resp => ({
        ...resp,
        data: this.mapDtoToLite(resp.data)
      })),
      catchError(err => {
        console.error('[FormaPagoService][createFormaPago] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: null as any,
          message: 'Error al crear forma de pago'
        } as ApiResponse<FormaPagoResponse>);
      })
    );
  }

  // =========================================================
  // 🔹 PUT /api/FormaPago/{id}
  // =========================================================
  updateFormaPago(id: number, payload: FormaPagoUpdateRequest):
    Observable<ApiResponse<FormaPagoResponse>> {

    const url = `${this.baseUrl}/FormaPago/${id}`;
    console.log('[FormaPagoService][PUT]', url, payload);

    return this.http.put<ApiResponse<FormaPagoDto>>(url, payload).pipe(
      map(resp => ({
        ...resp,
        data: this.mapDtoToLite(resp.data)
      })),
      catchError(err => {
        console.error('[FormaPagoService][updateFormaPago] ERROR =', err);
        return of({
          id: '',
          type: 'Error',
          data: null as any,
          message: 'Error al actualizar forma de pago'
        } as ApiResponse<FormaPagoResponse>);
      })
    );
  }
}
