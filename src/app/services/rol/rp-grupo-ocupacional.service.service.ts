import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string | null;
  count?: number;
}

export interface RpGrupoOcupacional {
  id_grupo_ocupacional: number;
  descripcion: string;
  codasocia: string;
  estado: boolean;
}

export interface RpGrupoOcupacionalRequest {
  descripcion: string;
  codasocia: string;
  estado: boolean;
}

export interface RpGrupoOcupacionalUpdateRequest {
  id_grupo_ocupacional: number;
  descripcion: string;
  codasocia: string;
  estado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RpGrupoOcupacionalService {

  private apiUrl = `${environment.maintenanceRolUrl}/RpGrupoOcupacional`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpGrupoOcupacional[]>> {
    return this.http.get<ApiResponse<RpGrupoOcupacional[]>>(this.apiUrl);
  }

  getById(id: number): Observable<ApiResponse<RpGrupoOcupacional>> {
    return this.http.get<ApiResponse<RpGrupoOcupacional>>(`${this.apiUrl}/${id}`);
  }

create(request: RpGrupoOcupacionalRequest): Observable<ApiResponse<RpGrupoOcupacional>> {
  return this.http.post<ApiResponse<RpGrupoOcupacional>>(this.apiUrl, request);
}

update(request: RpGrupoOcupacionalUpdateRequest): Observable<ApiResponse<RpGrupoOcupacional>> {
  return this.http.put<ApiResponse<RpGrupoOcupacional>>(this.apiUrl, request);
}

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }
}