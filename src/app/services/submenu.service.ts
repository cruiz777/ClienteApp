import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { SubMenuRequest } from '../interfaces/requests/submenu-request';
import { SubMenuResponse } from '../interfaces/responses/submenu-response';

@Injectable({
  providedIn: 'root'
})
export class SubMenuService {
  private apiUrl = `${environment.securityApiUrl}/SubMenus`;

  constructor(private http: HttpClient) { }

  // Crear nuevo submenu
  create(request: SubMenuRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, request);
  }

  // Actualizar submenu existente
  update(id: number, request: SubMenuRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, request);
  }

  // Eliminación lógica (soft delete)
  softDelete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/softDelete/${id}`, {});
  }

  // Eliminación física (hard delete)
  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  // Obtener submenus por menú (este es el más importante para tu caso)
  getSubMenusPorMenu(idMenu: number): Observable<ApiResponse<SubMenuResponse[]>> {
    return this.http.get<ApiResponse<SubMenuResponse[]>>(`${this.apiUrl}/menu/${idMenu}`);
  }
}