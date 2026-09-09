import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SaborResponse } from '../interfaces/responses/sabor-response';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class SaborService {
  private apiUrl = `${environment.inventoryUrl}/Sabor`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los sabores activos
   */
  getAll(): Observable<ApiResponse<SaborResponse[]>> {
    return this.http.get<ApiResponse<SaborResponse[]>>(this.apiUrl);
  }
}