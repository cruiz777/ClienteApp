import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PerfilOpciones } from '../interfaces/responses/perfil-opcion-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PerfilOpcionService {
  private apiUrl = `${environment.applicationUrl}/PerfilesOpciones`;

  constructor(private http: HttpClient) {}

  getOpcionesPorPerfilYMenu(idPerfil: number, idMenu: number):Observable<ApiResponse<PerfilOpciones[]>>{
    return this.http.get<ApiResponse<PerfilOpciones[]>>(`${this.apiUrl}/perfil/${idPerfil}/menu/${idMenu}`)
  }

}
