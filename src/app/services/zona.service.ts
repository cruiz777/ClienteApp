import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ZonaResponse } from '../interfaces/responses/zona-response';
import { ApiResponse } from '../interfaces/responses/api-response';
import { ZonaRequest } from '../interfaces/requests/zona-request';

export interface Zona {
  id: number;
  referencia:string;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZonaService {
  private apiBaseUrl = environment.securityApiUrl;
  private apiUrl = `${this.apiBaseUrl}/Zonas/`;
  constructor(private http: HttpClient) {}

  obtenerZona(): Observable<Zona[]> {
    debugger
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data.map((item: any) => ({
        id: item.idZona,
        referencia:item.referencia,
        nombre: item.nombre
      })))
    );
  }
    getAll(): Observable<ZonaResponse[]> {
    return this.http.get<ApiResponse<ZonaResponse[]>>(this.apiUrl).pipe(
      map(res => res.data)
    );
  }

  getById(id: number): Observable<ZonaResponse> {
    return this.http.get<ApiResponse<ZonaResponse>>(`${this.apiUrl}${id}`).pipe(
      map(res => res.data)
    );
  }

  create(zona: ZonaRequest): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, zona).pipe(
      map(res => res.data)
    );
  }

  update(id: number, zona: ZonaRequest): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}${id}`, zona).pipe(
      map(res => res.data)
    );
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}${id}`).pipe(
      map(res => res.data)
    );
  }
}
