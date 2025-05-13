import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DepartamentoResponse } from '../interfaces/responses/departamentos-response';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DepartamentoRequest } from '../interfaces/requests/departamento-request';

@Injectable({ providedIn: 'root' })
export class DepartamentosService {
  private url = `${environment.securityApiUrl}/Departamentos`; //Se concatena el endpoint

  constructor(private http: HttpClient) {}

  getDepartamentos(): Observable<DepartamentoResponse[]> {
    return this.http.get<any>(this.url).pipe(
      map(resp => resp.data)
    );
  }

  softDeleteDepartamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
  createDepartamento(payload: DepartamentoRequest): Observable<DepartamentoResponse> {
    return this.http.post<DepartamentoResponse>(this.url, payload);
  }

  updateDepartamento(id: number, payload: DepartamentoRequest): Observable<DepartamentoResponse> {
    return this.http.put<DepartamentoResponse>(`${this.url}/${id}`, payload);
  }

  getDepartamentoById(id: number): Observable<DepartamentoResponse> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(resp => resp.data)
    );
  }
}
