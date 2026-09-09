import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string | null;
  count?: number;
}

export interface RpTipoContrato {
  idTipoContrato: number;
  descripcion: string;
  valor: number | null;
  estado: string | null;
  paramhoras: number | null;
  grupotipo: string | null;
  horassemana: number | null;
  bono: boolean;
  codigo: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RpTipoContratoService {

  private readonly apiUrl = `${environment.maintenanceRolUrl}/RpTipoContrato`;

  constructor(private http: HttpClient) {}

  getTiposContrato(): Observable<ApiResponse<RpTipoContrato[]>> {
    return this.http.get<ApiResponse<RpTipoContrato[]>>(this.apiUrl);
  }
}