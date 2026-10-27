import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CorreoRequest } from '../interfaces/requests/correo-request.interface';
import { CorreoResponse } from '../interfaces/responses/correo-response.interface';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

@Injectable({ providedIn: 'root' })
export class CorreosService {
  private apiUrl = `${environment.securityApiUrl}/Correos`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los correos
   */
  getCorreos(): Observable<CorreoResponse[]> {
    return this.http.get<ApiListResponse<CorreoResponse[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  /**
   * Obtener correo por ID
   */
  getCorreoById(id: number): Observable<CorreoResponse> {
    return this.http.get<ApiListResponse<CorreoResponse>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Crear nuevo correo
   */
  createCorreo(correo: CorreoRequest): Observable<boolean> {
    return this.http.post<ApiListResponse<boolean>>(this.apiUrl, correo).pipe(
      map(response => response.data)
    );
  }

  /**
   * Actualizar correo existente
   */
  updateCorreo(id: number, correo: CorreoRequest): Observable<boolean> {
    return this.http.put<ApiListResponse<boolean>>(`${this.apiUrl}/${id}`, correo).pipe(
      map(response => response.data)
    );
  }

  /**
   * Eliminar correo
   */
  deleteCorreo(id: number): Observable<boolean> {
    return this.http.delete<ApiListResponse<boolean>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }
}