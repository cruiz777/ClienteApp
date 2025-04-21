import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface GrupoProducto {
  id_grupo_producto: number;
  codigo:string;
  brick: string;
  desBrick: string;
}
@Injectable({
  providedIn: 'root'
})
export class GrupoProductoService {

  private apiBaseUrl = environment.applicationUrl;
    private apiUrl = `${this.apiBaseUrl}/GrupoProducto`;
    constructor(private http: HttpClient) {}
  
    obtenerGrupos(): Observable<GrupoProducto[]> {
      return this.http.get<any>(this.apiUrl).pipe(
        map(response => {
          console.log('✅ Respuesta del backend:', response); // Verifica que llega al método
          return response.data.map((item: any) => ({
            id_grupo_producto: item.id_grupo_producto,
            codigo: item.codigo,
            brick: item.brick,
            desBrick: item.desBrick
          }));
        })
      );
    }
    
    
}
