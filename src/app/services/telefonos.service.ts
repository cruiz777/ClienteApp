import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TelefonoRequest } from '../interfaces/requests/telefono-request.interface';
import { TelefonoResponse } from '../interfaces/responses/telefono-response.interface';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

@Injectable({ providedIn: 'root' })
export class TelefonosService {
  private apiUrl = `${environment.securityApiUrl}/Telefonos`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los teléfonos
   */
  getTelefonos(): Observable<TelefonoResponse[]> {
    return this.http.get<ApiListResponse<TelefonoResponse[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  /**
   * Obtener teléfono por ID
   */
  getTelefonoById(id: number): Observable<TelefonoResponse> {
    return this.http.get<ApiListResponse<TelefonoResponse>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Crear nuevo teléfono
   */
  createTelefono(telefono: TelefonoRequest): Observable<boolean> {
    return this.http.post<ApiListResponse<boolean>>(this.apiUrl, telefono).pipe(
      map(response => response.data)
    );
  }

  /**
   * Actualizar teléfono existente
   */
  updateTelefono(id: number, telefono: TelefonoRequest): Observable<boolean> {
    return this.http.put<ApiListResponse<boolean>>(`${this.apiUrl}/${id}`, telefono).pipe(
      map(response => response.data)
    );
  }

  /**
   * Eliminar teléfono
   */
  deleteTelefono(id: number): Observable<boolean> {
    return this.http.delete<ApiListResponse<boolean>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }
}