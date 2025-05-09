import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PerfilOpciones } from '../interfaces/responses/perfil-opcion-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';
import {PerfilOpcion}from'../interfaces/requests/perfil-opcion-request';

@Injectable({
  providedIn: 'root'
})
export class PerfilOpcionService {
  private apiUrl = `${environment.applicationUrl}/PerfilesOpciones`;

  constructor(private http: HttpClient) {}

  getOpcionesPorPerfilYMenu(idPerfil: number, idMenu: number):Observable<ApiResponse<PerfilOpciones[]>>{
    return this.http.get<ApiResponse<PerfilOpciones[]>>(`${this.apiUrl}/perfil/${idPerfil}/menu/${idMenu}`)
  }

  actualizarOpcion(perfilOpcion:PerfilOpcion): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl,perfilOpcion);
  }

}
