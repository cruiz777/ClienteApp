import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

export interface TipoContribuyenteResponse {
  id_tipo_contribuyente: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TipoContribuyenteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.inventoryUrl}/tipocontribuyente`;

  getAll(soloActivos: boolean = true): Observable<ApiResponse<TipoContribuyenteResponse[]>> {
    const params = new HttpParams().set('soloActivos', soloActivos.toString());
    return this.http.get<ApiResponse<TipoContribuyenteResponse[]>>(this.apiUrl, { params });
  }
}