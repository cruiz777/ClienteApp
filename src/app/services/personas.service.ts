import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

// Interfaces
import { PersonaResponse } from '../interfaces/responses/persona-response';
import { PersonaRequest } from '../interfaces/requests/persona-request';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

@Injectable({ providedIn: 'root' })
export class PersonasService {
  private apiUrl = `${environment.securityApiUrl}/Personas`;

  constructor(private http: HttpClient) { }

  /**
   * Obtener todas las personas
   */
  getPersonas(): Observable<PersonaResponse[]> {
    return this.http.get<ApiListResponse<PersonaResponse[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  /**
   * Obtener persona por ID
   * @param id número de persona
   */
  getPersonaById(id: number): Observable<PersonaResponse> {
    return this.http.get<ApiListResponse<PersonaResponse>>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        console.log('Persona cargada:', response.data);
        return response.data;
      })
    );
  }

  /**
 * Buscar persona por número de documento (cédula o RUC)
 */
  buscarPersonaPorDocumento(numero: string): Observable<PersonaResponse[]> {
    return this.http.get<ApiListResponse<PersonaResponse[]>>(`${this.apiUrl}/documento/${numero}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Buscar personas por nombre
   */
  buscarPersonasPorNombre(nombre: string): Observable<PersonaResponse[]> {
    return this.http.get<ApiListResponse<PersonaResponse[]>>(`${this.apiUrl}/buscar`, {
      params: { nombre }
    }).pipe(
      map(response => response.data)
    );
  }


  /**
   * Crear nueva persona
   * @param persona datos del formulario (PersonaRequest)
   */
  createPersona(persona: PersonaRequest): Observable<PersonaResponse> {
    return this.http.post<ApiListResponse<PersonaResponse>>(this.apiUrl, persona).pipe(
      map(response => response.data)
    );
  }

  /**
   * Actualizar persona existente
   * @param id ID de la persona a actualizar
   * @param persona datos actualizados
   */
  updatePersona(id: number, persona: PersonaRequest): Observable<PersonaResponse> {
    return this.http.put<ApiListResponse<PersonaResponse>>(`${this.apiUrl}/${id}`, persona).pipe(
      map(response => response.data)
    );
  }

  /**
   * Eliminación lógica (Soft Delete)
   * @param id ID de la persona
   */
  softDeletePersona(id: number): Observable<boolean> {
    return this.http.delete<ApiListResponse<boolean>>(`${this.apiUrl}/soft/${id}`).pipe(
      map(response => response.data)
    );
  }
}
