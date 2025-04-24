import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PersonaResponse } from '../interfaces/responses/persona-response';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

@Injectable({ providedIn: 'root' })
export class PersonasService {
  private apiUrl = `${environment.applicationUrl}/Personas`;

  constructor(private http: HttpClient) {}

  getPersonas(): Observable<PersonaResponse[]> {
    return this.http.get<ApiListResponse<PersonaResponse[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  getPersonaById(id: number): Observable<PersonaResponse> {
    return this.http.get<ApiListResponse<PersonaResponse>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  //  updateEmpresa(id: number, persona: PersonaRequest): Observable<PersonaResponse> {
  //     return this.http.put<ApiListResponse<PersonaResponse>>(`${this.apiUrl}/${id}`, persona).pipe(
  //       map(response => response.data)
  //     );
  //   }

    // Eliminación lógica
    softDeleteEmpresa(id: number): Observable<any> {
      return this.http.delete<ApiListResponse<any>>(`${this.apiUrl}/soft/${id}`).pipe(
        map(response => response.data)
      );
    }
}
