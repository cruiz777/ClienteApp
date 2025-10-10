import { EstructuraComercialRequest } from './../interfaces/requests/estructura-comercial-request';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './producto.service';
import { EstructuraComercialResponse } from '../interfaces/responses/estructura-comercial-response';

@Injectable({
  providedIn: 'root'
})
export class EstructuraComercialService {
  private apiUrl = `${environment.inventoryUrl}/Estructuracomercial`;

  constructor(private http: HttpClient) { }

  getByFk(id: number): Observable<ApiResponse<EstructuraComercialResponse[]>> {
    return this.http.get<ApiResponse<EstructuraComercialResponse[]>>(`${this.apiUrl}/empresa/${id}`);
  }

  create(data: EstructuraComercialRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.apiUrl, data);
  }

  update(data: EstructuraComercialRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.apiUrl, data);
  }
}
