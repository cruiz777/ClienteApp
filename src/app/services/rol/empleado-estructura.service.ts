import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string | null;
}

export type FiltroEstructuraEmpleado =
  | 'tipo'
  | 'cargo'
  | 'zona'
  | 'departamento';

export interface EmpleadoEstructuraResponse {
  idEmpleado: number;
  nombre: string;
  tipoEmpleado: string | null;
  departamento: string | null;
  cargo: string | null;
  zona: string | null;
  documento: string | null;
  ctaCble: string | null;
  fecIngreso: string | null;
  idTipemp: number;
  idZona: number | null;
  idCargo: number;
  idDepartamento: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class EmpleadoEstructuraService {
  private readonly apiUrl = `${environment.employeesUrl}/Empleado/estructura`;

  constructor(private http: HttpClient) {}

  getByFiltro(
    filtro: FiltroEstructuraEmpleado,
    id: number
  ): Observable<EmpleadoEstructuraResponse[]> {
    const params = new HttpParams()
      .set('filtro', filtro)
      .set('id', id.toString());

    return this.http
      .get<ApiResponse<EmpleadoEstructuraResponse[]>>(this.apiUrl, { params })
      .pipe(
        map(resp => resp?.data ?? [])
      );
  }

  getByTipoEmpleado(idTipemp: number): Observable<EmpleadoEstructuraResponse[]> {
    return this.getByFiltro('tipo', idTipemp);
  }

  getByCargo(idCargo: number): Observable<EmpleadoEstructuraResponse[]> {
    return this.getByFiltro('cargo', idCargo);
  }

  getByZona(idZona: number): Observable<EmpleadoEstructuraResponse[]> {
    return this.getByFiltro('zona', idZona);
  }

  getByDepartamento(idDepartamento: number): Observable<EmpleadoEstructuraResponse[]> {
    return this.getByFiltro('departamento', idDepartamento);
  }
}