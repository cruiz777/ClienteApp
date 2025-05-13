import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TipoLocalizacionResponse } from '../interfaces/responses/tipo-localizacion-response';
import { TipoLocalizacionRequest } from '../interfaces/requests/tipo-localizacion-request';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TipoLocalizacionService {
  private apiUrl = `${environment.clientsUrl}/TipoLocalizacion`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<{ data: TipoLocalizacionResponse[] }> {
    return this.http.get<{ data: TipoLocalizacionResponse[] }>(`${this.apiUrl}`);
  }

  getById(id: number): Observable<{ data: TipoLocalizacionResponse }> {
    return this.http.get<{ data: TipoLocalizacionResponse }>(`${this.apiUrl}/${id}`);
  }

  create(payload: TipoLocalizacionRequest): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  update(id: number, payload: TipoLocalizacionRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
