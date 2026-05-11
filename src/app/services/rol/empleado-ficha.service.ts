import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number;
}

export interface EmpleadoFichaResponse {
  idEmpleado: number;
  nombre: string;
  tipoEmpleado?: string;
  departamento?: string;
  cargo?: string;
  zona?: string;
  documento?: string;
  ctaCble?: string;
  fecIngreso?: string;
  idTipemp: number;
  idZona?: number;
  idCargo: number;
  id_departamento?: number;
  nombres: string;
  apellidos: string;  apellido2: string;
  fecNac: string;
  idTipoDocumento?: number;
  estadoCivilCodigo?: number;
  generoCodigo?: number;
  id?: number;
  idCiudad?: number;
  direccion?: string;
  mail?: string;
  telefono?: string;
  id_nacionalidad?: number;
  idCiudadTrabajo?: number;
  empresa?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmpleadoFichaService {

  private readonly apiUrl = `${environment.employeesUrl}/empleado/getficha`;

  constructor(private http: HttpClient) {}

  getFicha(idEmpleado?: number): Observable<ApiResponse<EmpleadoFichaResponse[]>> {
    let params = new HttpParams();

    if (idEmpleado && idEmpleado > 0) {
      params = params.set('idEmpleado', idEmpleado.toString());
    }

    return this.http.get<ApiResponse<EmpleadoFichaResponse[]>>(this.apiUrl, { params });
  }
}