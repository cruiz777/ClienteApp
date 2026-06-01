import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface TipoObservacion {
  idTipoObservacion: number;
  descripcion: string;
  estado: boolean;
}

export interface ApiResponseTipoObservacion {
  id: string;
  type: string;
  data: TipoObservacion[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class TipoObservacionService {

  private readonly apiUrl = `${environment.maintenanceRolUrl}/TipoObservacion`;

  constructor(private http: HttpClient) {}

  getTiposObservacion(): Observable<TipoObservacion[]> {
    return this.http
      .get<ApiResponseTipoObservacion>(this.apiUrl)
      .pipe(
        map(response => response.data ?? [])
      );
  }

  getTiposObservacionResponse(): Observable<ApiResponseTipoObservacion> {
    return this.http.get<ApiResponseTipoObservacion>(this.apiUrl);
  }
}