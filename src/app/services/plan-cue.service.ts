import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface PlanCuenta {
  id_plan: number;
  cuenta_principal: string;
  cuenta_mayor: string;
  cuenta_subcta: string;
  cuenta_presentacion: string;
  nombre_cuenta: string;
  codigo_completo: string;
  numero_cuenta: string;
  id_empresa: number;
}

export interface PlanCuentaApiResponse {
  id: string;
  type: string;          // "Success"
  data: PlanCuenta;
  message: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class PlanCueService {
  // Ejemplo: environment.invoices_sic = 'http://localhost:5010/invoices-sic/api'
  private readonly baseUrl = `${environment.invoices_sic}/PlanCuentas`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener un plan de cuentas por Cuenta Presentación e IdEmpresa
   * GET /PlanCuentas/presentacion/{idEmpresa}/{cuentaPresentacion}
   * Retorna directamente PlanCuenta (resp.data)
   */
  getByCuentaPresentacion(
    idEmpresa: number,
    cuentaPresentacion: string
  ): Observable<PlanCuenta> {
    return this.http
      .get<PlanCuentaApiResponse>(
        `${this.baseUrl}/presentacion/${idEmpresa}/${encodeURIComponent(cuentaPresentacion)}`
      )
      .pipe(
        map(resp => resp.data)
      );
  }
}
