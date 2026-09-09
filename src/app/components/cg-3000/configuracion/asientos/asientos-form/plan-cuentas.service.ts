// src/app/asientos/asientos-form/plan-cuentas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CuentaPlanDTO {
  id: number;
  codigo: string;
  descripcion: string;
}
export interface PlanCuentasPage {
  items: CuentaPlanDTO[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class PlanCuentasService {
  private baseUrl = '/api/plan-cuentas'; // ajusta tu endpoint

  constructor(private http: HttpClient) {}

  buscar(search: string, pageIndex: number, pageSize: number, sortField: string, sortDir: 'asc'|'desc'):
    Observable<PlanCuentasPage> {
    const params = new HttpParams()
      .set('search', search ?? '')
      .set('page', pageIndex.toString())
      .set('size', pageSize.toString())
      .set('sort', sortField || 'codigo')
      .set('dir', sortDir || 'asc');
    return this.http.get<PlanCuentasPage>(this.baseUrl, { params });
  }
}
