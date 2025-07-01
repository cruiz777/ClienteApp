import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ParametrosFactura {
  id_parametrosFactura: number;
  codpar: string;
  descripcion?: string;
  activado: boolean;
  valor?: number;
  texto?: string;
  fecmod?: Date;
  obs?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParametrosFacturaService {

  private apiBaseUrl = environment.invoicesUrl;
  private baseUrl = `${this.apiBaseUrl}/ParametrosFactura`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParametrosFactura[]> {
    return this.http.get<ParametrosFactura[]>(this.baseUrl).pipe(
      map(data =>
        data.map(item => ({
          ...item,
          descripcion: item.descripcion?.trim() ?? '',
          texto: item.texto?.trim() ?? '',
          obs: item.obs?.trim() ?? ''
        }))
      )
    );
  }

  getById(id: number): Observable<ParametrosFactura> {
    return this.http.get<ParametrosFactura>(`${this.baseUrl}/${id}`).pipe(
      map(item => ({
        ...item,
        descripcion: item.descripcion?.trim() ?? '',
        texto: item.texto?.trim() ?? '',
        obs: item.obs?.trim() ?? ''
      }))
    );
  }

  create(parametro: ParametrosFactura): Observable<ParametrosFactura> {
    return this.http.post<ParametrosFactura>(this.baseUrl, parametro);
  }

  update(id: number, parametro: ParametrosFactura): Observable<ParametrosFactura> {
    return this.http.put<ParametrosFactura>(`${this.baseUrl}/${id}`, parametro);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
