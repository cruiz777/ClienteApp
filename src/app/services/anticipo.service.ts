// src/app/services/anticipo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateAnticipoRequest } from '../interfaces/requests/anticipo-request';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { AnticipoResponse } from '../interfaces/responses/anticipo-response';

@Injectable({
  providedIn: 'root'
})
export class AnticipoService {
  private apiUrl = `${environment.invoices_sic}/Anticipo`;

  constructor(private http: HttpClient) {}

  /**
   * Crea un nuevo anticipo
   */
  create(request: CreateAnticipoRequest): Observable<ApiListResponse<AnticipoResponse>> {
    return this.http.post<ApiListResponse<AnticipoResponse>>(this.apiUrl, request);
  }
}
