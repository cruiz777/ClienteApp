import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';

import { UnidadVentaResponse } from '../interfaces/responses/unidad-venta-response'

@Injectable({
  providedIn: 'root'
})

export class UniddaVentaService {

  private apiUrl = `${environment.inventoryUrl}/UnidadVenta`;
  constructor(private http: HttpClient) { }

  getUnidadVenta(): Observable<ApiResponse<UnidadVentaResponse[]>> {
    return this.http.get<ApiResponse<UnidadVentaResponse[]>>(this.apiUrl);
  }
}

