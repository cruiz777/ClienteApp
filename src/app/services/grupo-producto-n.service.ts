import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface GrupoProductoRequest {
  id_grupo_producto: number;
  codigo: string;
  descripcion: string;
  segmento: string;
  desSegmento: string;
  familia: string;
  desFamilia: string;
  clase: string;
  desClase: string;
  brick: string;
  desBrick: string;
  desSegmentoing: string;
  desFamiliaing: string;
  desClaseing: string;
  desBricking: string;
  brickIncludes: string;
  brickExcludes: string;
  estado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GrupoProductoNService {
  private apiBaseUrl = environment.clientsUrl;
  private apiUrl = `${this.apiBaseUrl}/GrupoProducto`;

  constructor(private http: HttpClient) {}

  // ✅ Obtener todos los grupos
  getAll(): Observable<GrupoProductoRequest[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(res => res.data)
    );
  }

  // ✅ Obtener un grupo por ID
  getById(id: number): Observable<GrupoProductoRequest> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

 

  create(grupo: GrupoProductoRequest): Observable<any> {
  return this.http.post<any>(this.apiUrl, grupo);// ✅ ¡mantén esto!
}

update(id: number, grupo: GrupoProductoRequest): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/${id}`, grupo); // ✅ CORRECTO
}




  // ✅ Eliminar un grupo
  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
