import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id?: string;
  type?: string;
  data: T;
  message?: string;
}

export interface PlanCuentaMiniDto {
  IdPlanCuentas: number;
  CuentaPresentacion: string;
  NombreCuenta: string;
}

@Injectable({ providedIn: 'root' })
export class PlanActivosService {

  // ✅ IMPORTANTE: aquí va /api
  private readonly baseUrl = `${environment.maintenanceUrl}/PlanCuentas`;

  constructor(private http: HttpClient) {}

  // ✅ nuevo endpoint: id_nivel = 5
  getMiniNivel5(): Observable<PlanCuentaMiniDto[]> {
    return this.http
      .get<ApiResponse<PlanCuentaMiniDto[]>>(`${this.baseUrl}/mini-nivel5`)
      .pipe(map(r => r?.data ?? []));
  }

  // tu endpoint existente: /mini?cuentas=...
  getMiniByPresentacion(cuentas: string[]): Observable<PlanCuentaMiniDto[]> {
    const cleaned = this.normalizeCuentas(cuentas);
    if (cleaned.length === 0) return of([]);

    let params = new HttpParams();
    cleaned.forEach(c => (params = params.append('cuentas', c)));

    return this.http
      .get<ApiResponse<PlanCuentaMiniDto[]>>(`${this.baseUrl}/mini`, { params })
      .pipe(map(r => r?.data ?? []));
  }

  private normalizeCuentas(input: string[]): string[] {
    const arr = (input ?? []).filter(Boolean);

    let expanded: string[] = [];
    if (arr.length === 1 && (arr[0].includes(',') || arr[0].includes(' '))) {
      expanded = arr[0].split(/[, ]+/g);
    } else {
      expanded = arr;
    }

    const cleaned = expanded
      .map(x => (x ?? '').trim().replace(/^['"]|['"]$/g, ''))
      .filter(x => !!x);

    return Array.from(new Set(cleaned));
  }
}
