import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: 'LIST' | 'ERROR' | string;
  data: T;
  message: string;
}

export interface AfResumenContableDetalleRow {
  categoria: string;
  anio: number | null;
  fecha: string | null;          // "dd/MM/yyyy"
  idPlanCuentas: number | null;  // OK (en BD es BIGINT, aquí es number)
  asiento: string | null;
  debe: number | null;
  haber: number | null;
  comentario: string | null;
  esSaldo: boolean;
}

@Injectable({ providedIn: 'root' })
export class AfResumenContableDetalleService {
  // Debe ser: http://localhost:5030/maintenance-cg/api
  private readonly baseUrl = `${environment.maintenanceUrl}/activo-fijo`;

  constructor(private http: HttpClient) {}

  getDetalle(
    anio: number,
    mes: number,
    categoria?: string | number | null
  ): Observable<ApiResponse<AfResumenContableDetalleRow[]>> {
    let params = new HttpParams()
      .set('anio', String(anio))
      .set('mes', String(mes));

    const cat = categoria === null || categoria === undefined ? '' : String(categoria).trim();
    if (cat) params = params.set('categoria', cat);

    return this.http.get<ApiResponse<AfResumenContableDetalleRow[]>>(
      `${this.baseUrl}/resumen-contable/detalle`,
      { params }
    );
  }

  /** ✅ Recomendado: retorna SOLO data y si el backend manda type=ERROR, lanza error */
  getDetalleData(
    anio: number,
    mes: number,
    categoria?: string | number | null
  ): Observable<AfResumenContableDetalleRow[]> {
    return this.getDetalle(anio, mes, categoria).pipe(
      map(resp => {
        if ((resp.type || '').toUpperCase() === 'ERROR') {
          throw new Error(resp.message || 'Error al consultar detalle.');
        }
        return resp.data ?? [];
      })
    );
  }

  getDetallePorCategoriaLocal(
    anio: number,
    mes: number,
    categoria: string
  ): Observable<AfResumenContableDetalleRow[]> {
    return this.getDetalleData(anio, mes).pipe(
      map(rows => rows.filter(r => (r.categoria ?? '').toUpperCase() === categoria.toUpperCase()))
    );
  }

  getDetalleAgrupado(
    anio: number,
    mes: number,
    categoria?: string | number | null
  ): Observable<Record<string, AfResumenContableDetalleRow[]>> {
    return this.getDetalleData(anio, mes, categoria).pipe(
      map(rows => {
        const grouped: Record<string, AfResumenContableDetalleRow[]> = {};
        rows.forEach(r => {
          const key = r.categoria || 'SIN_CATEGORIA';
          (grouped[key] ??= []).push(r);
        });
        return grouped;
      })
    );
  }
}