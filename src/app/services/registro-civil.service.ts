import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface RegistroCivilResponse {
  cedula: string;
  nombre: string;
  genero: string;
  fechaNacimiento: string;
  estadoCivil: string;
  // puedes incluir más campos si lo necesitas
}

@Injectable({
  providedIn: 'root'
})
export class RegistroCivilService {
  // ✅ URL de tu backend intermediario
  private backendUrl =  environment.securityApiUrl;

  constructor(private http: HttpClient) {}

  consultarCedula(cedula: string): Observable<RegistroCivilResponse> {
    const url = `${this.backendUrl}/registro-civil/consultar/${cedula}`;
    return this.http.get<RegistroCivilResponse>(url);
  }
}
