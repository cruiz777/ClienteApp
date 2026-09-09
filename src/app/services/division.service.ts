import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './producto.service';
import { DivisionRequest } from '../interfaces/requests/division-request';
import { DivisionResponse } from '../interfaces/responses/division-response';

@Injectable({
  providedIn: 'root'
})
export class DivisionService {
  private apiUrl = `${environment.inventoryUrl}/Division`;

  constructor(private http: HttpClient) { }

  getByFk(id: number): Observable<ApiResponse<DivisionResponse[]>> {
    return this.http.get<ApiResponse<DivisionResponse[]>>(`${this.apiUrl}/estructura/${id}`);
  }

  create(data: DivisionRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(data: DivisionRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.apiUrl, data);
  }
}
