import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

export interface ApiResponseNuevo<T> { 
  id: string;
  type: string;
  data: T;
  message: string;
  count: number | null;
}

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


getByIdN(id: number): Observable<ParametrosFactura> {
  return this.http.get<ApiResponseNuevo<ParametrosFactura>>(`${this.baseUrl}/${id}`).pipe(
    map(resp => ({
      ...resp.data,
      descripcion: resp.data.descripcion?.trim() ?? '',
      texto: resp.data.texto?.trim() ?? '',
      obs: resp.data.obs?.trim() ?? ''
    }))
  );
}

  getByIdUrl(id: number): Observable<ParametrosFactura> {
    return this.http.get<ApiResponse<ParametrosFactura>>(`${this.baseUrl}/${id}`).pipe(
      map(response => {
        const item = response.data;
        return {
          ...item,
          descripcion: item.descripcion?.trim() ?? '',
          texto: item.texto?.trim() ?? '',
          obs: item.obs?.trim() ?? ''
        };
      })
    );
  }
  getUrlReenvioDocumentos(): Observable<string> {
    return this.getByIdUrl(10005).pipe(
      map(param => param.texto || '')
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
