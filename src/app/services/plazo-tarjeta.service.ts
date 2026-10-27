// src/app/services/plazo-tarjeta.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';
import { PlazoTarjeta } from '../interfaces/responses/plazo-tarjeta-response';

@Injectable({
  providedIn: 'root'
})
export class PlazoTarjetaService {
  private apiUrl = `${environment.invoices_sic}/PlazoTarjeta`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los plazos de tarjeta
   */
  getAll(): Observable<ApiListResponse<PlazoTarjeta[]>> {
    return this.http.get<ApiListResponse<PlazoTarjeta[]>>(this.apiUrl);
  }
}
