import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { RpFormaPagoResponse } from 'src/app/interfaces/responses/forma-pago-rol-response';
import { CreateRpFormaPagoRequest } from 'src/app/interfaces/requests/forma-pago-rol-request';

@Injectable({
  providedIn: 'root'
})
export class RpFormaPagoService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/RpFomaPago`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpFormaPagoResponse[]>> {
    return this.http.get<ApiResponse<RpFormaPagoResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpFormaPagoResponse>> {
    return this.http.get<ApiResponse<RpFormaPagoResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRpFormaPagoRequest): Observable<ApiResponse<RpFormaPagoResponse>> {
    return this.http.post<ApiResponse<RpFormaPagoResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateRpFormaPagoRequest): Observable<ApiResponse<RpFormaPagoResponse>> {
    return this.http.put<ApiResponse<RpFormaPagoResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}