import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DireccionRequest } from '../interfaces/requests/direccion-request.interface';
import { DireccionResponse } from '../interfaces/responses/direccion-response.interface';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

@Injectable({ providedIn: 'root' })
export class DireccionesService {
  private apiUrl = `${environment.securityApiUrl}/Direcciones`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las direcciones
   */
  getDirecciones(): Observable<DireccionResponse[]> {
    return this.http.get<ApiListResponse<DireccionResponse[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  /**
   * Obtener dirección por ID
   */
  getDireccionById(id: number): Observable<DireccionResponse> {
    return this.http.get<ApiListResponse<DireccionResponse>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Crear nueva dirección
   */
  createDireccion(direccion: DireccionRequest): Observable<boolean> {
    return this.http.post<ApiListResponse<boolean>>(this.apiUrl, direccion).pipe(
      map(response => response.data)
    );
  }

  /**
   * Actualizar dirección existente
   */
  updateDireccion(id: number, direccion: DireccionRequest): Observable<boolean> {
    return this.http.put<ApiListResponse<boolean>>(`${this.apiUrl}/${id}`, direccion).pipe(
      map(response => response.data)
    );
  }

  /**
   * Eliminar dirección (soft delete)
   */
  softDeleteDireccion(id: number): Observable<boolean> {
    return this.http.delete<ApiListResponse<boolean>>(`${this.apiUrl}/soft/${id}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Eliminar dirección (hard delete)
   */
  deleteDireccion(id: number): Observable<boolean> {
    return this.http.delete<ApiListResponse<boolean>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }
}