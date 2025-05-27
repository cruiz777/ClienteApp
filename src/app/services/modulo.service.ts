import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModuloResponse } from '../interfaces/responses/modulo-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ModuloService {
  private apiUrl = `${environment.securityApiUrl}/Modulos`;

  constructor(private http: HttpClient) {}

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
}
