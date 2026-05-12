import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { IngresoDescuentosResponse } from '../interfaces/responses/ingreso-descuentos-request';
import { CreateIngresoDescuentosRequest } from '../interfaces/requests/ingreso-descuentos-request';

@Injectable({
  providedIn: 'root'
})
export class IngresoDescuentosService {

  private readonly baseUrl = `${environment.maintenanceRol}/IngresoDescuentos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<IngresoDescuentosResponse[]>> {
    return this.http.get<ApiResponse<IngresoDescuentosResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<IngresoDescuentosResponse>> {
    return this.http.get<ApiResponse<IngresoDescuentosResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateIngresoDescuentosRequest): Observable<ApiResponse<IngresoDescuentosResponse>> {
    return this.http.post<ApiResponse<IngresoDescuentosResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateIngresoDescuentosRequest): Observable<ApiResponse<IngresoDescuentosResponse>> {
    return this.http.put<ApiResponse<IngresoDescuentosResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}