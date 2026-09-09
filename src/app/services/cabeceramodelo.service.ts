// src/app/services/cabeceramodelo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';                 // ✅ incluye of
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { ApiResponse } from './producto.service';
import { CabeceraModeloResponse } from '../interfaces/responses/cabecera-modelo-response';
import { CabeceraModeloRequest } from '../interfaces/requests/cabecera-modelo-request';

export type CabeceraModeloOpcion = { id: number; label: string };

@Injectable({ providedIn: 'root' })
export class CabeceraModeloService {
  private readonly baseUrl = `${environment.maintenanceUrl}/CabeceraModelo`;

  constructor(private http: HttpClient) {}

  /** ✅ Devuelve opciones {id,label} para el combo, robusto ante wrapper ApiListResponse */
  listarCabModelos(): Observable<CabeceraModeloOpcion[]> {
    return this.http.get<ApiListResponse<CabeceraModeloResponse[]>>(this.baseUrl).pipe(
      // Algunos endpoints devuelven wrapper { data: [...] }, otros devuelven el array directo.
      map(resp => {
        const list = Array.isArray((resp as any)?.data) ? (resp as any).data as CabeceraModeloResponse[]
                   : (resp as any) as CabeceraModeloResponse[];
        return (list ?? []).map(x => ({
          id: Number(x.IdCabModelo) || 0,          // ✅ IdCabModelo viene como string
          label: x.Nombre ?? ''
        }));
      }),
      catchError(err => {
        console.error('Error cargando modelos', err);
        return of<CabeceraModeloOpcion[]>([]);     // ✅ of importado
      })
    );
  }


  // ==== CRUD existentes ====
  getAll(): Observable<ApiListResponse<CabeceraModeloResponse[]>> {
    return this.http.get<ApiListResponse<CabeceraModeloResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<CabeceraModeloResponse>> {
    return this.http.get<ApiResponse<CabeceraModeloResponse>>(`${this.baseUrl}/${id}`);
  }

  create(data: CabeceraModeloRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.baseUrl, data);
  }

  update(id: number, data: CabeceraModeloRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  softDelete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/soft-delete/${id}`);
  }
}
