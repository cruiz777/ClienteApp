import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface Umedida {
  codigo: number;
  descripcion: string;
  unidad: string;
  net_content_uom: string;
  estado: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class UmedidaService {
  private apiBaseUrl = environment.invoicesUrl;

  constructor(private http: HttpClient) { }

  obtenerUnidades(): Observable<Umedida[]> {

    return this.http.get<{ data: Umedida[] }>(`${this.apiBaseUrl}/UnidadMedida`).pipe(
      map(response => response.data)
    );
  }

  obtenerUnidadPorNombre(nombre: string): Observable<Umedida> {
    return this.http
      .get<{ data: Umedida | null }>(`${this.apiBaseUrl}/UnidadMedida/por-nombre`, {
        params: { nombre }
      })
      .pipe(
        map(response => {
          if (!response.data) {
            throw new Error(`Unidad no encontrada: ${nombre}`);
          }
          return response.data;
        })
      );
  }
  obtenerUnidadPorUnidad(unidad: string): Observable<Umedida> {
    return this.http
      .get<{ data: Umedida | null }>(`${this.apiBaseUrl}/UnidadMedida/por-unidad`, {
        params: { unidad }
      })
      .pipe(
        map(response => {
          if (!response.data) {
            throw new Error(`Unidad no encontrada: ${unidad}`);
          }
          return response.data;
        })
      );
  }

}
