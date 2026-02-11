// src/app/services/activos-fijos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

/** Respuesta estándar de tu API: { traceId, type, data, message } */
export interface ApiResponse<T> {
  traceId?: string;
  type?: string;
  data: T;
  message?: string;
}

/** DTO EXACTO según Swagger (request/response) */
export interface ActivoFijoDto {
  CodigoAf: number;
  Codigobarra?: string | null;
  IdPlanCuentas?: number | null;
  Descripcion?: string | null;
  Marca?: string | null;
  IdMarca?: number | null;
  Feccompra?: string | null;
  Vidautil?: number | null;
  Model?: string | null;
  Serie?: string | null;
  Valorcompra?: number | null;
  Valorresidual?: number | null;
  Tipcod?: number | null;
  Destipcod?: string | null;
  Local?: number | null;
  Comprobante?: string | null;
  Observacion?: string | null;
  Color?: string | null;
  Ubicacion?: string | null;
  Custodio?: string | null;
  Tiempodeprec?: string | null;

  IdPlanCuentas1?: number | null;
  IdPlanCuentas2?: number | null;
  IdPlanCuentas3?: number | null;
  IdPlanCuentas4?: number | null;
  IdPlanCuentas5?: number | null;

  ValorRazonable?: number | null;
  AjusteIncremento?: number | null;
  VidaUtilTotal?: number | null;
  SaldoVidaUtil?: number | null;
  NvaDepresiacionAnual?: number | null;

  PathImagenActivo?: string | null;
  FechaajusteNiifs?: string | null;

  DepresiacionAnual?: number | null;
  ValorLibros?: number | null;
  PorcentajeDepresiacion?: number | null;
  DepDeducibleSri?: number | null;
  DepNoDeducibleNiifs?: number | null;
  PorcentajeDepreciado?: number | null;
  DepreAcumulada?: number | null;

  DebeCuenta1?: number | null;
  HaberCuenta1?: number | null;
  DebeCuenta2?: number | null;
  HaberCuenta2?: number | null;
  DebeCuenta3?: number | null;
  HaberCuenta3?: number | null;

  Proveedor?: string | null;
  DepresiacionMensual?: number | null;
  ComprobanteDiario?: string | null;
  DepreMensual?: number | null;

  TiempodeprecMes?: string | null;
  TiempodeprecDia?: string | null;

  ComprobanteRet?: string | null;
  Poliza?: string | null;

  Debecuenta4?: number | null;
  Debecuenta5?: number | null;
  Habercuenta4?: number | null;
  Habercuenta5?: number | null;

  Intangible?: number | null;

  FechaDepreciacion?: string | null;
  FechaDeprecia?: string | null;
  FechaIngreso?: string | null;

  HoraIngreso?: string | null;
  IdUsuario?: number | null;
  IdEmpresa?: number | null;
  IdDepartamento?: number | null;
  DepartamentoNombre?: string | null;
  PlanCuentaNombre?: string | null;
  Cuenta?: string | null;
  MarcaDescripcion?: string | null;



}

/** Respuesta opcional para paginación */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ActivoFijoApiService {
  /**
   * ✅ según Swagger: /api/ActivoFijo
   * baseApi: maintenanceUrl (ej: http://localhost:500x)
   */
  private readonly baseApi = environment.maintenanceUrl ?? '';
  private readonly baseUrl = `${this.baseApi}/ActivoFijo`;

  constructor(private http: HttpClient) {}

  /** GET: /api/ActivoFijo */
  getAll(): Observable<ActivoFijoDto[]> {
    return this.http.get<ApiResponse<ActivoFijoDto[]>>(this.baseUrl).pipe(
      map(r => r?.data ?? [])
    );
  }

  /** GET: /api/ActivoFijo/{id} */
  getById(id: number): Observable<ActivoFijoDto | null> {
    return this.http.get<ApiResponse<ActivoFijoDto>>(`${this.baseUrl}/${id}`).pipe(
      map(r => r?.data ?? null)
    );
  }

  /** POST: /api/ActivoFijo  -> ApiResponse<boolean> */
  create(payload: ActivoFijoDto): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(this.baseUrl, payload).pipe(
      map(r => !!r?.data)
    );
  }

  /** PUT: /api/ActivoFijo/{id} -> ApiResponse<boolean> */
  update(id: number, payload: ActivoFijoDto): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, payload).pipe(
      map(r => !!r?.data)
    );
  }

  /** DELETE: /api/ActivoFijo/{id} -> ApiResponse<boolean> */
  delete(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`).pipe(
      map(r => !!r?.data)
    );
  }

  /** Opcional si implementas /paged */
  getPaged(opts: { q?: string; page: number; pageSize: number }): Observable<PagedResult<ActivoFijoDto>> {
    let params = new HttpParams()
      .set('page', String(opts.page))
      .set('pageSize', String(opts.pageSize));
    if (opts.q?.trim()) params = params.set('q', opts.q.trim());

    return this.http.get<ApiResponse<PagedResult<ActivoFijoDto>>>(`${this.baseUrl}/paged`, { params }).pipe(
      map(r => r?.data ?? { items: [], total: 0, page: opts.page, pageSize: opts.pageSize })
    );
  }
}
