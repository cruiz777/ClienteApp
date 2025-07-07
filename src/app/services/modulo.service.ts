import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';

import { ModuloResponse } from '../interfaces/responses/modulo-response';
import { ModulosRequest } from '../interfaces/requests/modulo-request'

@Injectable({
  providedIn: 'root'
})
export class ModuloService {
  private apiUrl = `${environment.securityApiUrl}/Modulos`;

  constructor(private http: HttpClient) { }

  getPerfiles(): Observable<ApiResponse<ModuloResponse[]>> {
    return this.http.get<ApiResponse<ModuloResponse[]>>(this.apiUrl);
  }

  /**
   * Obtiene los módulos asociados a un sistema específico.
   * @param idSistema ID del sistema seleccionado
   */
  getModulosPorSistema(idSistema: number): Observable<ApiResponse<ModuloResponse[]>> {
    return this.http.get<ApiResponse<ModuloResponse[]>>(`${this.apiUrl}/sistem/${idSistema}`);
  }

  createModulo(data: ModulosRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  softDelete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/softDelete/${id}`, {});
  }

  updateModulo(id: number, data: ModulosRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, data);
  }

}
