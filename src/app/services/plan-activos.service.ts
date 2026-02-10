import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
  /**
   * Ajusta según tu env:
   * Ejemplo: environment.maintenanceUrl = 'http://localhost:5030/maintenance-cg'
   * Endpoint real:  {maintenanceUrl}/api/PlanCuentas/mini
   */
  private readonly baseUrl = `${environment.maintenanceUrl}/PlanCuentas`;

  constructor(private http: HttpClient) {}

  /**
   * ✅ Recomendado:
   * envía array real como:
   * /mini?cuentas=120101-001&cuentas=120102-001...
   */
  getMiniByPresentacion(cuentas: string[]): Observable<PlanCuentaMiniDto[]> {
    const cleaned = this.normalizeCuentas(cuentas);

    if (cleaned.length === 0) {
      return new Observable<PlanCuentaMiniDto[]>(sub => {
        sub.next([]);
        sub.complete();
      });
    }

    let params = new HttpParams();
    cleaned.forEach(c => (params = params.append('cuentas', c)));

    return this.http
      .get<ApiResponse<PlanCuentaMiniDto[]>>(`${this.baseUrl}/mini`, { params })
      .pipe(map(r => r?.data ?? []));
  }

  /**
   * ✅ Alternativa:
   * si te llega una sola cadena tipo:
   * "120101-001,120102-001 120103-001"
   * la mandamos como un solo query param y tu backend lo separa.
   */
  getMiniByPresentacionRaw(cuentasRaw: string): Observable<PlanCuentaMiniDto[]> {
    const cleaned = this.normalizeCuentas([cuentasRaw]);

    if (cleaned.length === 0) {
      return new Observable<PlanCuentaMiniDto[]>(sub => {
        sub.next([]);
        sub.complete();
      });
    }

    // lo enviamos en una sola string separada por coma (lo acepta tu handler)
    const joined = cleaned.join(',');

    const params = new HttpParams().set('cuentas', joined);

    return this.http
      .get<ApiResponse<PlanCuentaMiniDto[]>>(`${this.baseUrl}/mini`, { params })
      .pipe(map(r => r?.data ?? []));
  }

  /**
   * Normaliza valores:
   * - soporta que venga un solo item con comas/espacios
   * - remueve comillas
   * - trim
   * - distinct
   */
  private normalizeCuentas(input: string[]): string[] {
    const arr = (input ?? []).filter(Boolean);

    // si viene 1 solo item con varios
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
