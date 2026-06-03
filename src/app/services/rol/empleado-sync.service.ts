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

export interface SyncEmpleadoRequest {
  idEmpleado?: number | null;
  idPersona?: number | null;

  documento: string;
  nombre1: string;
  nombre2?: string | null;
  apellido1: string;
  apellido2?: string | null;
  fechaNacimiento?: string | null;
  idEstadoCivil: number;
  tipoPersona?: string | null;
  idTipoDocumento: number;
  idGenero?: number | null;
  idCiudad: number;
  status: boolean;

  idEmpresa: number;
  idCargo: number;
  idTipemp: number;
  idNacionalidad: number;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  carcony?: boolean | null;
  carhijos?: number | null;
  numafil?: number | null;
  idSectorial?: number | null;
  foto?: string | null;
  idTipoSangre?: number | null;
  codcentel?: string | null;
  ctaCble?: string | null;

  provisiones: boolean;
  decimos: boolean;
  decimo3ro: boolean;
  freserva: boolean;

  idRegimen?: number | null;
  discap?: boolean | null;
  teredad?: boolean | null;
  idEmpresaComplementaria?: number | null;
  galapagos?: boolean | null;
  enfcatastro?: boolean | null;

  retJudicial: boolean;
  valorRetencionJ?: number | null;
  idGrupoOcupacional?: number | null;
  repLegal: boolean;
  impRenta: boolean;
  idObs?: number | null;

  fechaSueldo?: string | null;
  sueldo?: number | null;
  valorHora?: number | null;
  valorHoraEspe?: number | null;
  valhorain?: boolean | null;
  quincena?: number | null;
  quincenaIi?: number | null;

  idZona?: number | null;
  idLocal?: number | null;
  idGasSri?: number | null;
  idDepartamento?: number | null;
  fecNac?: string | null;
  idCiudadTrabajo?: number | null;
  feinivac?: string | null;
  fefinvac?: string | null;
  establecimiento?: string | null;
  lmilitar?: string | null;

}

@Injectable({
  providedIn: 'root'
})
export class EmpleadoSyncService {

  private readonly apiUrl = `${environment.employeesUrl}/Empleado`;

  constructor(private http: HttpClient) {}

  sync(request: SyncEmpleadoRequest): Observable<ApiResponse<number>> {
    return this.http.put<ApiResponse<number>>(
      `${this.apiUrl}/sync`,
      request
    );
  }

  delete(idEmpleado: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/${idEmpleado}`
    );
  }
}