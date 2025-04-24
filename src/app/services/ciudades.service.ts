import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponseCiudad } from '../interfaces/responses/ciudad-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CiudadService {
  private apiUrl = `${environment.applicationUrl}/Ciudades/resume`;

  constructor(private http: HttpClient) {}

  getCiudades(): Observable<ApiResponseCiudad> {
    return this.http.get<ApiResponseCiudad>(this.apiUrl);
  }
}
