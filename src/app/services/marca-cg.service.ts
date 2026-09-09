// src/app/services/marca-cg.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

/** ApiResponse genérico como tu backend:
 *  { id, type, data, message }
 */
export interface ApiResponse<T> {
  id?: string;
  type?: string;
  data: T;
  message?: string;
}

export interface MarcaCgDto {
  IdMarca: number;
  Tipmar?: string | null;
  Desmar?: string | null;
  Marca?: string | null;
}

/** Para Create/Update (sin IdMarca en Create) */
export interface MarcaCgRequest {
  Tipmar?: string | null;
  Desmar?: string | null;
  Marca?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MarcaCgService {
  /** Base real: http://localhost:5030/maintenance-cg/api
   *  Ajusta environment.maintenanceUrl = 'http://localhost:5030/maintenance-cg/api'
   */
  private readonly baseUrl = `${environment.maintenanceUrl}/MarcaCg`;

  constructor(private http: HttpClient) {}

  /** GET /api/MarcaCg -> lista */
  getAll(): Observable<MarcaCgDto[]> {
    return this.http.get<ApiResponse<MarcaCgDto[]>>(this.baseUrl).pipe(
      map(r => r?.data ?? [])
    );
  }

  /** GET /api/MarcaCg/{id} -> objeto */
  getById(id: number): Observable<MarcaCgDto | null> {
    return this.http.get<ApiResponse<MarcaCgDto>>(`${this.baseUrl}/${id}`).pipe(
      map(r => r?.data ?? null)
    );
  }

  /** POST /api/MarcaCg -> boolean */
  create(payload: MarcaCgRequest): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(this.baseUrl, payload).pipe(
      map(r => !!r?.data)
    );
  }

  /** PUT /api/MarcaCg/{id} -> boolean */
  update(id: number, payload: MarcaCgRequest): Observable<boolean> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, payload).pipe(
      map(r => !!r?.data)
    );
  }

  /** DELETE /api/MarcaCg/{id} -> boolean */
  delete(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`).pipe(
      map(r => !!r?.data)
    );
  }
}
