// src/app/services/clasificacion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;       // "Success" | "Error"
  data: T;
  message: string;
}

/** 🔹 Modelo que usarás en el front */
export interface ClasificacionResponse {
  idClasificacion: number;
  descripcion: string;
  codigoCuenta: string;
  estado: boolean;
}

/** 🔹 Estructura paginada que devuelve el backend */
export interface PagedData<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message: string;
}

/** 🔹 Request POST /api/Clasificacion */
export interface ClasificacionCreateRequest {
  descripcion: string;
  codigoCuenta: string;
  estado: boolean;
}

/** 🔹 Request PUT /api/Clasificacion/{id} */
export interface ClasificacionUpdateRequest extends ClasificacionCreateRequest {
  idClasificacion: number;
}

@Injectable({ providedIn: 'root' })
export class ClasificacionService {
  // Igual que en FormaPago: http://localhost:5010/invoices-sic/api
  private baseUrl = environment.invoices_sic;

  constructor(private http: HttpClient) {}

  // =========================================================
  // 🔹 GET paginado: /Clasificacion?page=&pageSize=
  // =========================================================
  getPaged(page = 1, pageSize = 10): Observable<ApiResponse<PagedData<ClasificacionResponse>>> {
    const url = `${this.baseUrl}/Clasificacion`;
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    console.log('[ClasificacionService][GET]', url, 'params =', { page, pageSize });

    return this.http
      .get<ApiResponse<PagedData<ClasificacionResponse>>>(url, { params })
      .pipe(
        tap(resp => console.log('[ClasificacionService] OK resp =', resp)),
        catchError(err => {
          console.error('[ClasificacionService][getPaged] ERROR =', err);
          return of({
            id: '',
            type: 'Error',
            message: 'Error al obtener clasificaciones paginadas',
            data: {
              items: [],
              page,
              pageSize,
              totalItems: 0,
              totalPages: 0,
              message: 'Error al obtener clasificaciones'
            }
          } as ApiResponse<PagedData<ClasificacionResponse>>);
        })
      );
  }

  // =========================================================
  // 🔹 Opcional: obtener todas (para combos)
  //     Internamente pide pageSize grande para traer todo.
  // =========================================================
  getAll(): Observable<ApiResponse<ClasificacionResponse[]>> {
    const url = `${this.baseUrl}/Clasificacion`;
    const params = new HttpParams()
      .set('page', '1')
      .set('pageSize', '500'); // ajusta si esperas más

    return this.http
      .get<ApiResponse<PagedData<ClasificacionResponse>>>(url, { params })
      .pipe(
        map(resp => ({
          id: resp.id,
          type: resp.type,
          message: resp.message,
          data: resp.data?.items ?? []
        })),
        catchError(err => {
          console.error('[ClasificacionService][getAll] ERROR =', err);
          return of({
            id: '',
            type: 'Error',
            data: [] as ClasificacionResponse[],
            message: 'Error al obtener clasificaciones'
          } as ApiResponse<ClasificacionResponse[]>);
        })
      );
  }

  // =========================================================
  // 🔹 POST /api/Clasificacion
  // =========================================================
  createClasificacion(payload: ClasificacionCreateRequest):
    Observable<ApiResponse<ClasificacionResponse>> {

    const url = `${this.baseUrl}/Clasificacion`;
    console.log('[ClasificacionService][POST]', url, payload);

    return this.http
      .post<ApiResponse<ClasificacionResponse>>(url, payload)
      .pipe(
        catchError(err => {
          console.error('[ClasificacionService][createClasificacion] ERROR =', err);
          return of({
            id: '',
            type: 'Error',
            data: null as any,
            message: 'Error al crear clasificación'
          } as ApiResponse<ClasificacionResponse>);
        })
      );
  }

  // =========================================================
  // 🔹 PUT /api/Clasificacion/{id}
  // =========================================================
  updateClasificacion(id: number, payload: ClasificacionUpdateRequest):
    Observable<ApiResponse<ClasificacionResponse>> {

    const url = `${this.baseUrl}/Clasificacion/${id}`;
    console.log('[ClasificacionService][PUT]', url, payload);

    return this.http
      .put<ApiResponse<ClasificacionResponse>>(url, payload)
      .pipe(
        catchError(err => {
          console.error('[ClasificacionService][updateClasificacion] ERROR =', err);
          return of({
            id: '',
            type: 'Error',
            data: null as any,
            message: 'Error al actualizar clasificación'
          } as ApiResponse<ClasificacionResponse>);
        })
      );
  }
}
