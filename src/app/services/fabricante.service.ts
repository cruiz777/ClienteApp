import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FabricanteResponse } from '../interfaces/responses/fabricante-response';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class FabricanteService {
  private apiUrl = `${environment.inventoryUrl}/Fabricante`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los fabricantes activos
   */
  getAll(): Observable<ApiResponse<FabricanteResponse[]>> {
    return this.http.get<ApiResponse<FabricanteResponse[]>>(this.apiUrl);
  }
}