import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

export interface TipoRetencionResponse {
  id_tipo_retencion: number;
  codigo_tipo_ret: string;
  descripcion: string;
  porcentaje: number;
  texto_combo: string; // "codigo - descripcion (porcentaje%)"
}

@Injectable({
  providedIn: 'root'
})
export class TipoRetencionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.inventoryUrl}/tiporetencion`;

  getAll(searchTerm?: string): Observable<ApiResponse<TipoRetencionResponse[]>> {
    let params = new HttpParams();
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }
    return this.http.get<ApiResponse<TipoRetencionResponse[]>>(this.apiUrl, { params });
  }
}