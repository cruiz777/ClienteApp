import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { RpTipEmpResponse } from '../interfaces/responses/tipo-empleado-response';
import { CreateRpTipEmpRequest } from '../interfaces/requests/tipo-empleado.request';

@Injectable({
  providedIn: 'root'
})
export class RpTipEmpService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/RpTipEmp`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<RpTipEmpResponse[]>> {
    return this.http.get<ApiResponse<RpTipEmpResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<RpTipEmpResponse>> {
    return this.http.get<ApiResponse<RpTipEmpResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRpTipEmpRequest): Observable<ApiResponse<RpTipEmpResponse>> {
    return this.http.post<ApiResponse<RpTipEmpResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateRpTipEmpRequest): Observable<ApiResponse<RpTipEmpResponse>> {
    return this.http.put<ApiResponse<RpTipEmpResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}