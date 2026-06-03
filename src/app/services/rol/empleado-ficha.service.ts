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

export interface EmpleadoBusquedaResponse {
  idEmpleado: number;
  documento: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
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
  id_grupo_ocupacional?: number;
  foto?:string;
  proviciones?:boolean;
  decimos?:boolean;
  decimo3ro?:boolean;
  freserva?:boolean;
  teredad?:boolean;
  discap?:boolean;
  ret_judicial?:boolean;
  rep_legal?:boolean;
  imp_renta?:boolean;
  fecha_sueldo?:string;
  sueldo?:number;
  quincena?:number;
  quincenaIi?:number;
  valor_retencion_j?:number;
  valor_hora?:number;
  valor_hora_espe?:number;
  carcony?:boolean;
  carhijos?:number;
  feinivac?:string;
  fefinvac?:string;
  id_tipo_sangre?:number;
  id_regimen?:number;
  establecimiento?:string;
  lmilitar?:string;
  idSectorial?: number;
  idEmpresaComplementaria?: number;
  galapagos?: boolean;
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

  getBusqueda(texto?: string): Observable<ApiResponse<EmpleadoBusquedaResponse[]>> {
  let params = new HttpParams();

  if (texto && texto.trim() !== '') {
    params = params.set('texto', texto.trim());
  }

  return this.http.get<ApiResponse<EmpleadoBusquedaResponse[]>>(
    `${environment.employeesUrl}/Empleado/busqueda`,
    { params }
  );
}

}