import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface GrupoEmpresa {
  id_grupo_empresa: number;
  codigo:string;
  nombre: string;
  inscripcion:number;
  asignacion:number;
  mantenimiento:number;
}

@Injectable({
  providedIn: 'root'
})
export class GrupoEmpresaService {
  private apiBaseUrl = environment.clientsUrl;
  private apiUrl = `${this.apiBaseUrl}/GrupoEmpresa/`;
  constructor(private http: HttpClient) {}

  obtenerGrupos(): Observable<GrupoEmpresa[]> {
    
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data.map((item: any) => ({
        id_grupo_empresa: item.id_grupo_empresa,
        codigo:item.codigo,
        nombre: item.nombre
      })))
    );
  }

   obtenerGrupoBasicoPorId(id: number): Observable<{ codigo: string; nombre: string }> {
  return this.http.get<any>(`${this.apiUrl}${id}`).pipe(
    map(resp => {
      const d = resp.data;
      return {
        codigo: d.codigo,
        nombre: d.nombre,
        inscripcion:d.inscripcion,
        asignacion:d.asignacion,
        mantenimiento:d.mantenimiento
      };
    })
  );
}

}
