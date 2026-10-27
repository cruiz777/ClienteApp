import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string | null;
}

export interface RpCargoResponse {
  idCargo: number;
  descargo: string;
  responsable: boolean;
  codsec: string;
  horEnf: boolean;
  frmensual: boolean;
  estado: boolean;
  idSectorial: number;
  idEmpresa: number;
}

@Injectable({
  providedIn: 'root'
})
export class RpCargosService {
  private readonly apiUrl = `${environment.maintenanceRolUrl}/RpCargos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RpCargoResponse[]> {
    return this.http
      .get<ApiResponse<RpCargoResponse[]>>(this.apiUrl)
      .pipe(map(resp => resp?.data ?? []));
  }

  getResponse(): Observable<ApiResponse<RpCargoResponse[]>> {
    return this.http.get<ApiResponse<RpCargoResponse[]>>(this.apiUrl);
  }
}