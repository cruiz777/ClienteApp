// src/app/core/services/plan-cuenta.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

export interface PlanCuenta {
  id_plan_cuentas: number;
  cuenta_presentacion: string;
  descripcion: string;
  codigo_completo: string;
  nombre_cuenta: string;
  texto_combo: string; // "codigo - descripcion"
}

@Injectable({
  providedIn: 'root'
})
export class PlanCuentaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.inventoryUrl}/plancuenta`;

  /**
   * Obtiene cuentas de nivel 5 (movimiento) para combos
   */
  getAll(searchTerm?: string, limit: number = 50): Observable<ApiResponse<PlanCuenta[]>> {
    let params = new HttpParams().set('limit', limit.toString());
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }
    return this.http.get<ApiResponse<PlanCuenta[]>>(this.apiUrl, { params });
  }
}