import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ Declarar la interfaz FUERA de la clase
export interface NumeroControlMinDto {
  id: number;
  numcon: string;
}

@Injectable({
  providedIn: 'root'
})
export class NcontrolService {

  private apiBaseUrl = environment.clientsUrl;
  private apiUrl = `${this.apiBaseUrl}/NumeroControl`;

  constructor(private http: HttpClient) {}

  obtenerNumeroControlMinPorId(id: number): Observable<NumeroControlMinDto> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => ({
        id: response.data.id,
        numcon: response.data.numcon
      }))
    );
  }
  actualizarNumeroControl(id: number, data: { numcon: string; ocupado: boolean }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }
}



