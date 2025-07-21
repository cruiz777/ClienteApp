import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './producto.service';
import { GrupoRequest } from '../interfaces/requests/grupo-request';
import { GrupoResponse } from '../interfaces/responses/grupo-response';

@Injectable({
  providedIn: 'root'
})
export class GrupoService {
  private apiUrl = `${environment.applicationUrl}/grupo`;

  constructor(private http: HttpClient) { }

  getByFk(id: number): Observable<ApiResponse<GrupoResponse[]>> {
    return this.http.get<ApiResponse<GrupoResponse[]>>(`${this.apiUrl}/grupo/${id}`);
  }

  create(data: GrupoRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(data: GrupoRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.apiUrl, data);
  }
}
