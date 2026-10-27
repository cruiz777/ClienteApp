// src/app/services/tipo-anticipo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { TipoAnticipo } from '../interfaces/responses/tipo-anticipo-response';

@Injectable({
  providedIn: 'root'
})
export class TipoAnticipoService {
  private apiUrl = `${environment.invoices_sic}/TipoAnticipo`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de anticipo activos
   */
  getAll(): Observable<ApiListResponse<TipoAnticipo[]>> {
    return this.http.get<ApiListResponse<TipoAnticipo[]>>(this.apiUrl);
  }
}
