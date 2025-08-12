import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';

import { SubMenuResponse } from '../interfaces/responses/sub_menu_response';
import { SubMenusRequest } from '../interfaces/requests/sub_menu_request'

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = `${environment.applicationUrl}/SubMenus`;

  constructor(private http: HttpClient) { }

  getSubMenusPorMenu(idMenu: number): Observable<ApiResponse<SubMenuResponse[]>> {
    return this.http.get<ApiResponse<SubMenuResponse[]>>(`${this.apiUrl}/menu/${idMenu}`);
  }

  createSubMenu(data: SubMenusRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  softDelete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/softDelete/${id}`, {});
  }

  updateSubMenu(id: number, data: SubMenusRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, data);
  }
}
