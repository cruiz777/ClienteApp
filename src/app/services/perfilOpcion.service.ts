import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PerfilOpciones } from '../interfaces/responses/perfil-opcion-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';
import { PerfilOpcion } from '../interfaces/requests/perfil-opcion-request';
import { PerfilMenu } from '../interfaces/requests/perfil-menu-request';
import { CreateBulkPerfilOption } from '../interfaces/requests/create-bulk-perfil-options-request';

@Injectable({
  providedIn: 'root'
})
export class PerfilOpcionService {
  private apiUrl = `${environment.applicationUrl}/PerfilesOpciones`;

  constructor(private http: HttpClient) { }

  getOpcionesPorPerfilYMenu(idPerfil: number, idMenu: number): Observable<ApiResponse<PerfilOpciones[]>> {
    return this.http.get<ApiResponse<PerfilOpciones[]>>(`${this.apiUrl}/perfil/${idPerfil}/menu/${idMenu}`)
  }
  // Asignadas por SUBMENÚ
  getOpcionesPorPerfilYSubmenu(idPerfil: number, idSub: number): Observable<ApiResponse<PerfilOpciones[]>> {
    return this.http.get<ApiResponse<PerfilOpciones[]>>(
      `${this.apiUrl}/perfil/${idPerfil}/submenu/${idSub}`
    );
  }

  getOpcionesPorPerfilYModulo(idPerfil: number, idModulo: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/perfil/${idPerfil}/modulo/${idModulo}`);
  }
  // Toggle individual (PUT)
  updateOpcionStatus(idPerfil: number, idOpcion: number, status: boolean): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiUrl}/perfil/${idPerfil}/opcion/${idOpcion}`,
      { status }
    );
  }
  actualizarOpcion(perfilOpcion: PerfilOpcion): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, perfilOpcion);
  }

  CreateBulkPerfilOptions(createBulkPerfilOption: CreateBulkPerfilOption): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/asignar-todas`, createBulkPerfilOption);
  }
  getResumenPerfilSistema(idPerfil: number, idSistema: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/perfil/${idPerfil}/sistema/${idSistema}/resumen`);
  }
}
