import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id?: string;
  type: string;
  data: T;
  message?: string;
  count?: number;
}

export interface CargaEmpleadoResponse {
  idCarga: number;
  idEmpleado: number | null;
  idEmpresa: number;

  nombre: string | null;
  apellido: string | null;
  identificacion: string | null;
  direccion: string | null;
  telefono: string | null;

  fechaNacimiento: string | null;

  idGenero: number | null;
  genero: string | null;

  parentesco: string | null;
  
  utilidad: boolean | null;
  imprenta: boolean | null;
  estado: boolean | null;

  idTipoDiscapacidad: number | null;
  tipoDiscapacidad: string | null;
}
export interface CreateCargaEmpleadoRequest {
  idEmpleado: number | null;
  idEmpresa: number;
  nombre: string | null;
  apellido: string | null;
  identificacion: string | null;
  direccion: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  idGenero: number | null;
  parentesco: string | null;
  estado: boolean | null;

  utilidad: boolean | null;
  imprenta: boolean | null;
  idTipoDiscapacidad: number | null;
}

export interface UpdateCargaEmpleadoRequest extends CreateCargaEmpleadoRequest {
  idCarga: number;
}

export interface SyncCargasRequest {
  crear: CreateCargaEmpleadoRequest[];
  actualizar: UpdateCargaEmpleadoRequest[];
  eliminar: number[];
}
@Injectable({
  providedIn: 'root'
})
export class CargasEmpleadoService {

  private readonly apiUrl = `${environment.employeesUrl}/Cargas`;

  constructor(private http: HttpClient) {}

  getByEmpleado(idEmpleado: number): Observable<ApiResponse<CargaEmpleadoResponse[]>> {
    return this.http.get<ApiResponse<CargaEmpleadoResponse[]>>(
      `${this.apiUrl}/empleado/${idEmpleado}`
    );
  }
sync(request: SyncCargasRequest): Observable<ApiResponse<boolean>> {
  return this.http.put<ApiResponse<boolean>>(
    `${this.apiUrl}/sync`,
    request
  );

}
}