import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/interfaces/responses/api-response';
import { TipoCuentaBancoResponse } from 'src/app/interfaces/responses/tipo-cuenta-response';
import { CreateTipoCuentaBancoRequest } from 'src/app/interfaces/requests/tipo-cuenta-request';


@Injectable({
  providedIn: 'root'
})
export class TipoCuentaBancoService {

  private readonly baseUrl = `${environment.maintenanceRolUrl}/TipoCuentaBanco`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<TipoCuentaBancoResponse[]>> {
    return this.http.get<ApiResponse<TipoCuentaBancoResponse[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<TipoCuentaBancoResponse>> {
    return this.http.get<ApiResponse<TipoCuentaBancoResponse>>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTipoCuentaBancoRequest): Observable<ApiResponse<TipoCuentaBancoResponse>> {
    return this.http.post<ApiResponse<TipoCuentaBancoResponse>>(this.baseUrl, request);
  }

  update(id: number, request: CreateTipoCuentaBancoRequest): Observable<ApiResponse<TipoCuentaBancoResponse>> {
    return this.http.put<ApiResponse<TipoCuentaBancoResponse>>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }
}