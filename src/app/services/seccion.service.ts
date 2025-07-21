import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './producto.service';
import { SeccionRequest } from '../interfaces/requests/seccion-request';
import { SeccionResponse } from '../interfaces/responses/seccion-response';

@Injectable({
  providedIn: 'root'
})
export class SeccionService {
  private apiUrl = `${environment.applicationUrl}/seccion`;

  constructor(private http: HttpClient) { }

  getByFk(id: number): Observable<ApiResponse<SeccionResponse[]>> {
    return this.http.get<ApiResponse<SeccionResponse[]>>(`${this.apiUrl}/seccion/${id}`);
  }

  create(data: SeccionRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(data: SeccionRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.apiUrl, data);
  }
}
