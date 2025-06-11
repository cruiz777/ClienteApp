import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

import { SistemaResponse } from '../interfaces/responses/sistema-response';
import { SistemasRequest } from '../interfaces/requests/sistema-request';

@Injectable({
  providedIn: 'root'
})
export class SistemaService {
  private apiUrl = `${environment.applicationUrl}/Sistemas`;

  constructor(private http: HttpClient) { }

  getSistemas(): Observable<ApiResponse<SistemaResponse[]>> {
    return this.http.get<ApiResponse<SistemaResponse[]>>(this.apiUrl);
  }
  createSistema(data: SistemasRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  softDelete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/softDelete/${id}`, {});
  }

  updateSistema(id: number, data: SistemasRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/${id}`, data);
  }

}
