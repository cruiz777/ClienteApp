import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';

import { MenuResponse } from '../interfaces/responses/menu-response';
import { MenusRequest } from '../interfaces/requests/menu-request'

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = `${environment.applicationUrl}/Menus`;

  constructor(private http: HttpClient) { }

  getPerfiles(): Observable<ApiResponse<MenuResponse[]>> {
    return this.http.get<ApiResponse<MenuResponse[]>>(this.apiUrl);
  }
  /**
   * Obtiene los menús asociados a un módulo específico.
   * @param idModulo ID del módulo seleccionado
   */
  getMenusPorModulo(idModulo: number): Observable<ApiResponse<MenuResponse[]>> {
    return this.http.get<ApiResponse<MenuResponse[]>>(`${this.apiUrl}/modulo/${idModulo}`);
  }

  createMenu(data: MenusRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  softDelete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/softDelete/${id}`,{});
  }

  updateMenu(id: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, {});
  }
}
