import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EstadoCivil } from '../interfaces/catalogs/estado-civil.interface';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';

@Injectable({ providedIn: 'root' })
export class EstadoCivilService {
  private apiUrl = `${environment.securityApiUrl}/EstadoCivil`;

  constructor(private http: HttpClient) {}

  getEstadoCivil(): Observable<EstadoCivil[]> {
    return this.http.get<ApiListResponse<EstadoCivil[]>>(this.apiUrl).pipe(
          map(response => response.data)  // Solo devuelve el array de géneros
    );
  }
}
