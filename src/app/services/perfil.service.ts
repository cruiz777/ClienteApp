import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PerfilResponse } from '../interfaces/responses/perfil-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';
import { PerfilesRequest } from '../interfaces/requests/perfil-request'

@Injectable({
  providedIn: 'root'
})

export class PerfilesService {
  private apiUrl = `${environment.applicationUrl}/Perfiles`;

  constructor(private http: HttpClient) { }

  getPerfiles(): Observable<ApiResponse<PerfilResponse[]>> {
    return this.http.get<ApiResponse<PerfilResponse[]>>(this.apiUrl);
  }

  createPerfiles(perfil: PerfilesRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}`, perfil);
  }

  updatePerfiles(id: number, perfil: PerfilesRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, perfil);
  }

  softDeletePerfiles(id: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/softDelete/${id}`,{});
  }

}
