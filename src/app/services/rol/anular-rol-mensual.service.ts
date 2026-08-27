import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface ApiResponse<T> {
  type: string;
  message: string;
  data: T;
}

export interface AnularRolMensualRequest {
  fechaRol: string; // yyyy-MM-dd
}

@Injectable({
  providedIn: 'root'
})
export class AnularRolMensualService {

  private readonly apiUrl = environment.nominaUrl + '/RolNomina';

  constructor(private http: HttpClient) {}

  anularRolMensual(request: AnularRolMensualRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/anular-rol-mensual`,
      request
    );
  }
}