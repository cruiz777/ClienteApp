// src/app/services/activo-fijo-report.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ReporteDepreciacionRequest {
  anio: number;
  mes: number;
  cuentaPrefix6?: string | null;
}

export interface ReporteDepreciacionDto {
  expira: number;
  cuentaMy: string;
  codigoAf: number;
  descripcion?: string | null;
  feccompra?: string | null;
  proveedor?: string | null;
  comprobante?: string | null;
  valorcompra?: number | null;
  vidautil?: number | null;
  depresiacionAnual?: number | null;
  depreMensual?: number | null;
  valorresidual?: number | null;
  ctaContable1?: string | null;
  ctaContable2?: string | null;
  fechaConsulta?: string | null;
  empresa?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  nombreCuenta?: string | null;
  dias?: number | null;
  estado?: number | null;
}

/** Guardar en cg.detalle_activo_fijo */
export interface GuardarDepreciacionRequest {
  anio: number;
  mes: number;
  rows: ReporteDepreciacionDto[];
}
export interface GuardarDepreciacionResponse {
  insertados: number;
  duplicados: number;
}

type ApiEnvelope<T> = { type?: string; data?: T; message?: string };

function unwrap<T>(resp: any): T {
  if (resp && typeof resp === 'object' && ('data' in resp || 'type' in resp || 'message' in resp)) {
    const env = resp as ApiEnvelope<T>;
    const t = String(env.type ?? '').trim().toLowerCase();
    if (env.type != null && t && t !== 'success' && t !== 'ok' && t !== 'list' && t !== 'lista') {
      throw new Error(env.message || 'La operación no fue exitosa.');
    }
    return (env.data as T) ?? (resp as T);
  }
  return resp as T;
}

function extractErr(err: any): string {
  const raw = err?.error;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw?.message) return String(raw.message);
  if (err?.message) return String(err.message);
  return 'Ocurrió un error inesperado.';
}

@Injectable({ providedIn: 'root' })
export class ActivoFijoReportService {
  private readonly baseUrl = `${environment.maintenanceUrl}/activo-fijo`;

  constructor(private http: HttpClient) {}

  reporteDepreciacion(req: ReporteDepreciacionRequest): Observable<ReporteDepreciacionDto[]> {
    return this.http.post<any>(`${this.baseUrl}/reporte-depreciacion`, req).pipe(
      map((resp) => unwrap<ReporteDepreciacionDto[]>(resp) ?? []),
      catchError((err) => throwError(() => new Error(extractErr(err))))
    );
  }

  guardarDepreciacion(req: GuardarDepreciacionRequest): Observable<GuardarDepreciacionResponse> {
    return this.http.post<any>(`${this.baseUrl}/guardar-depreciacion`, req).pipe(
      map((resp) => unwrap<GuardarDepreciacionResponse>(resp)),
      catchError((err) => throwError(() => new Error(extractErr(err))))
    );
  }
}
