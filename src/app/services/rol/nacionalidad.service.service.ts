import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count?: number | null;
}

export interface NacionalidadResponse {
  id_nacionalidad: number;
  descripcion: string;
}

@Injectable({
  providedIn: 'root'
})
export class NacionalidadService {

  private readonly apiUrl = `${environment.maintenanceRolUrl}/Nacionalidad`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<NacionalidadResponse[]> {
    return this.http
      .get<ApiResponse<NacionalidadResponse[]>>(this.apiUrl)
      .pipe(map(resp => resp.data ?? []));
  }

  getById(id: number): Observable<NacionalidadResponse> {
    return this.http
      .get<ApiResponse<NacionalidadResponse>>(`${this.apiUrl}/${id}`)
      .pipe(map(resp => resp.data));
  }
}