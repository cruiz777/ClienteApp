import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RegistroCivilResponse } from '../interfaces/responses/RegistroCivilResponse';

@Injectable({
  providedIn: 'root'
})
export class RegistroCivilService {
  private backendUrl = environment.securityApiUrl;

  constructor(private http: HttpClient) {}

  consultarCedula(cedula: string): Observable<RegistroCivilResponse> {
    const nombreApi = 'cedula'; // Debe coincidir con el nombre en la base de datos
    const url = `${this.backendUrl}/apis-externas/${nombreApi}/consultar?parametro=${cedula}`;
    return this.http.get<RegistroCivilResponse>(url);
  }
}
