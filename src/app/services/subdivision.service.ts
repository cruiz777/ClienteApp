import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './producto.service';
import { SubDivisionRequest } from '../interfaces/requests/subdivision-request';
import { SubDivisionResponse } from '../interfaces/responses/subdivision-response';

@Injectable({
  providedIn: 'root'
})
export class SubdivisionService {
  private apiUrl = `${environment.applicationUrl}/subdivision`;

  constructor(private http: HttpClient) { }

  getByFk(id: number): Observable<ApiResponse<SubDivisionResponse[]>> {
    return this.http.get<ApiResponse<SubDivisionResponse[]>>(`${this.apiUrl}/subdivision/${id}`);
  }

  create(data: SubDivisionRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(data: SubDivisionRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.apiUrl, data);
  }
}
