import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';

import { OpcionResponse } from '../interfaces/responses/opcion-response';
import { OpcionesRequest } from '../interfaces/requests/opcion-request'

@Injectable({
  providedIn: 'root'
})
export class OpcionService {
  private apiUrl = `${environment.applicationUrl}/Opciones`;

  constructor(private http: HttpClient) { }

  getPerfiles(): Observable<ApiResponse<OpcionResponse[]>> {
    return this.http.get<ApiResponse<OpcionResponse[]>>(this.apiUrl);
  }

  /**
     * Obtiene los menús asociados a un módulo específico.
     * @param idModulo ID del módulo seleccionado
     */
  getOpcionesPorMenu(idMenu: number): Observable<ApiResponse<OpcionResponse[]>> {
    return this.http.get<ApiResponse<OpcionResponse[]>>(`${this.apiUrl}/menu/${idMenu}`);
  }

  createOpcion(data: OpcionesRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
}
