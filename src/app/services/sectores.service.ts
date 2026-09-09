// src/app/services/sectores.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Sector {
  id: number;
  descripcion: string;
}

export interface ApiListResponse<T> {
  id: string;
  type: 'LIST';
  data: T[];
  message: string;
  count: number | null;
}

@Injectable({ providedIn: 'root' })
export class SectoresService {
  private http = inject(HttpClient);

  // Ajusta la URL base según tu backend. Ejemplo:
  private baseUrl = `${environment.clientsUrl}/sector`;

  /** GET: lista de sectores (mapea response.data) */
  getAll(): Observable<Sector[]> {
    return this.http
      .get<ApiListResponse<Sector>>(this.baseUrl)
      .pipe(map(res => res.data));
  }

  /** GET: un sector por id */
  getById(id: number): Observable<Sector> {
    return this.http.get<Sector>(`${this.baseUrl}/${id}`);
  }

  /** POST: crear sector */
  create(payload: Pick<Sector, 'descripcion'>): Observable<Sector> {
    return this.http.post<Sector>(this.baseUrl, payload);
  }

  /** PUT: actualizar sector */
  update(id: number, payload: Partial<Sector>): Observable<Sector> {
    return this.http.put<Sector>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE: eliminar sector */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
