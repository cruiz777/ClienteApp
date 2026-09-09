import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ColorResponse } from '../interfaces/responses/color-response';
import { ApiResponse } from '../interfaces/responses/api-response';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  private apiUrl = `${environment.inventoryUrl}/Color`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los colores activos
   */
  getAll(): Observable<ApiResponse<ColorResponse[]>> {
    return this.http.get<ApiResponse<ColorResponse[]>>(this.apiUrl);
  }
}