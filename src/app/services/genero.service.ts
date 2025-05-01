import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Genero } from '../interfaces/catalogs/genero.interface';
import { ApiListResponse } from '../interfaces/responses/ApiListResponse';


@Injectable({ providedIn: 'root' })
export class GeneroService {
  private apiUrl = `${environment.applicationUrl}/Generos`;

  constructor(private http: HttpClient) {}

  getGeneros(): Observable<Genero[]> {
    return this.http.get<ApiListResponse<Genero[]>>(this.apiUrl).pipe(
              map(response => response.data)  // Solo devuelve el array de géneros
    );
  }
}
