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

export interface RpNivelInstruccionResponse {
  id_nivel_instruccion: number;
  descripcion: string;
  estado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RpNivelInstruccionService {

  private readonly apiUrl = `${environment.maintenanceRolUrl}/RpNivelInstruccion`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpNivelInstruccionResponse[]>> {
    return this.http.get<ApiResponse<RpNivelInstruccionResponse[]>>(this.apiUrl);
  }
}