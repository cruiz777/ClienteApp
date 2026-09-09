import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DepartamentoDto {
  IdDepartamento: number;
  Nombre: string | null;
  Cuenta: string | null;
  IdEmpresa: number | null;
  Estado: boolean;
}

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class DepartamentosActivosService {
  // Ajusta el environment según tu proyecto:
  // ejemplo: environment.maintenance_cg = 'http://localhost:5030/maintenance-cg/api'
  private readonly baseUrl = `${environment.maintenanceUrl}/Departamentos`;

  constructor(private http: HttpClient) {}

  /**
   * GET /api/Departamentos?idEmpresa=1
   */
  getAll(idEmpresa: number): Observable<DepartamentoDto[]> {
    return this.http
      .get<ApiResponse<DepartamentoDto[]>>(`${this.baseUrl}?idEmpresa=${encodeURIComponent(String(idEmpresa))}`)
      .pipe(map(resp => resp.data ?? []));
  }

  /**
   * GET /api/Departamentos/{id}?idEmpresa=1
   */
  getById(id: number, idEmpresa: number): Observable<DepartamentoDto | null> {
    return this.http
      .get<ApiResponse<DepartamentoDto>>(
        `${this.baseUrl}/${encodeURIComponent(String(id))}?idEmpresa=${encodeURIComponent(String(idEmpresa))}`
      )
      .pipe(map(resp => resp.data ?? null));
  }
}
