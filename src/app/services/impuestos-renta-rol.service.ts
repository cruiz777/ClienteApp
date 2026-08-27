import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { ImpuestoRentaResponse } from '../interfaces/responses/impuesto-renta-rol-request';
import { CreateImpuestoRentaRequest } from '../interfaces/requests/impuesto-renta-rol-request';

@Injectable({
  providedIn: 'root'
})
export class ImpuestoRentaService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/ImpuestoRenta`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<ImpuestoRentaResponse[]>> {
    return this.http.get<ApiResponse<ImpuestoRentaResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<ImpuestoRentaResponse>> {
    return this.http.get<ApiResponse<ImpuestoRentaResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateImpuestoRentaRequest): Observable<ApiResponse<ImpuestoRentaResponse>> {
    return this.http.post<ApiResponse<ImpuestoRentaResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateImpuestoRentaRequest): Observable<ApiResponse<ImpuestoRentaResponse>> {
    return this.http.put<ApiResponse<ImpuestoRentaResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}