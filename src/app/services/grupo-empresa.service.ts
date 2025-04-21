import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface GrupoEmpresa {
  id_grupo_empresa: number;
  codigo:string;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class GrupoEmpresaService {
  private apiBaseUrl = environment.applicationUrl;
  private apiUrl = `${this.apiBaseUrl}/GrupoEmpresa/`;
  constructor(private http: HttpClient) {}

  obtenerGrupos(): Observable<GrupoEmpresa[]> {
    debugger
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data.map((item: any) => ({
        id_grupo_empresa: item.id_grupo_empresa,
        codigo:item.codigo,
        nombre: item.nombre
      })))
    );
  }
}
