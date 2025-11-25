// src/app/services/plan-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

export interface PlanCuenta {
  CuentaPrincipal: string;
  CuentaMayor: string;
  CuentaSubcta: string;
  CuentaPresentacion: string;
  NombreCuenta: string;
  IdCodigoEspecial: number;
  IdNivel: number;
  Descripcion: string | null;
  CuentaHomologacion: string | null;
  PorcentajeRetencion: number;
  Estado: boolean;
  FechaActivacion: string | null;
  IdUsuario: number;
  IdCabModelo: number;
  ParentId: number | null;
  EsMovimiento: boolean;
  Orden: number | null;
  CuentaDetalle: string | null;
  CodigoCompleto: string | null;
  IdPlanCuentas: number;
  CodigoExterno: string | null;
  Norma: string | null;
  Alcanse: string | null;
  Medicion: string | null;
  IdEmpresa: number;
  Numerocuenta:string | null;
  Formato:string | null;
}

@Injectable({ providedIn: 'root' })
export class PlanCuentasService {
  private readonly baseUrl = `${environment.maintenanceUrl}/PlanCuentas`;
  constructor(private http: HttpClient) {}

  private mapItem = (x: any): PlanCuenta => ({
    CuentaPrincipal: x?.CuentaPrincipal ?? '',
    CuentaMayor: x?.CuentaMayor ?? '',
    CuentaSubcta: x?.CuentaSubcta ?? '',
    CuentaPresentacion: x?.CuentaPresentacion ?? '',
    NombreCuenta: x?.NombreCuenta ?? '',
    IdCodigoEspecial: Number(x?.IdCodigoEspecial ?? 0),
    IdNivel: Number(x?.IdNivel ?? 1),
    Descripcion: x?.Descripcion ?? null,
    CuentaHomologacion: x?.CuentaHomologacion ?? null,
    PorcentajeRetencion: Number(x?.PorcentajeRetencion ?? 0),
    Estado: x?.Estado !== false,
    FechaActivacion: x?.FechaActivacion ?? null,
    IdUsuario: Number(x?.IdUsuario ?? 0),
    IdCabModelo: Number(x?.IdCabModelo ?? 0),
    ParentId: Number(x?.ParentId ?? 0),
    EsMovimiento: !!x?.EsMovimiento,
    Orden: Number(x?.Orden ?? 0),
    CuentaDetalle: x?.CuentaDetalle ?? null,
    CodigoCompleto: x?.CodigoCompleto ?? '',
    IdPlanCuentas: Number(x?.IdPlanCuentas ?? 0),
    CodigoExterno: x?.CodigoExterno ?? '',
    Norma: x?.Norma ?? '',
    Alcanse: x?.Alcanse ?? '',
    Medicion: x?.Medicion ?? '',
    IdEmpresa: Number(x?.IdEmpresa ?? 0),
    Numerocuenta: x?.Numerocuenta ?? x?.NumeroCuenta ?? x?.numeroCuenta ?? '',
    Formato: x?.Formato ?? x?.FormatoCuenta ?? x?.formato ?? '',
  });

  private normalizeList(res: any): PlanCuenta[] {
    const list: any[] =
      Array.isArray(res) ? res :
      Array.isArray(res?.data) ? res.data :
      Array.isArray(res?.result) ? res.result :
      Array.isArray(res?.items) ? res.items :
      Array.isArray(res?.data?.items) ? res.data.items : [];
    return list.map(this.mapItem);
  }

  private normalizeOne(res: any): PlanCuenta {
    const x = res?.data ?? res?.result ?? res?.item ?? res?.value ?? res;
    return this.mapItem(x);
  }

  /** ✅ Acepta filtros: idEmpresa y estado */
  getAll(opts?: { idEmpresa?: number; estado?: string }): Observable<PlanCuenta[]> {
    let params = new HttpParams();
    if (opts?.idEmpresa != null) params = params.set('idEmpresa', String(opts.idEmpresa));
    if (opts?.estado) params = params.set('estado', opts.estado);

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map(res => {
        let items = this.normalizeList(res).filter(x => x.Estado !== false);
        if (opts?.idEmpresa != null) items = items.filter(x => x.IdEmpresa === opts.idEmpresa);
        return items;
      }),
      catchError(err => {
        console.error('PlanCuentasService.getAll error:', err);
        return of([] as PlanCuenta[]);
      })
    );
  }

  create(payload: Partial<PlanCuenta>): Observable<PlanCuenta> {
    return this.http.post<any>(this.baseUrl, payload).pipe(map(res => this.normalizeOne(res)));
  }

  update(id: number, payload: Partial<PlanCuenta>): Observable<PlanCuenta> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, payload).pipe(map(res => this.normalizeOne(res)));
  }

  setEstado(id: number, estado: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/estado`, { estado });
  }

  /**
   * ✅ Verifica existencia de CuentaPresentacion por Empresa,
   * con opción para excluir el Id actual cuando se edita.
   * Endpoint sugerido: GET /PlanCuentas/buscar-por-nombre?nombre=110101-006&idEmpresa=1&excludeId=123
   */
  existeCuentaPresentacion(
    nombre: string,
    idEmpresa: number,
    excludeId?: number
  ): Observable<{ exists: boolean; message: string }> {
    let params = new HttpParams()
      .set('nombre', (nombre ?? '').trim())
      .set('idEmpresa', String(idEmpresa));
    if (excludeId != null && excludeId > 0) params = params.set('excludeId', String(excludeId));

    const url = `${this.baseUrl}/buscar-por-nombre`;

    return this.http.get<ApiResponse<boolean> | boolean>(url, { params }).pipe(
      map((resp: any) => {
        const exists = typeof resp === 'boolean' ? resp : resp?.data === true;
        return { exists, message: exists ? 'La cuenta ya existe en esta empresa.' : '' };
      }),
      catchError(() => of({ exists: false, message: '' }))
    );
  }
}
