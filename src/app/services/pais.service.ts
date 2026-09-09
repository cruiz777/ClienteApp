// src/app/services/pais.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
export interface Pais {
  idPais: number;
  codzona: string;
  nombre: string;
  codigoArea: number | null;
}


@Injectable({
  providedIn: 'root'
})
export class PaisService {

  private apiBaseUrl = environment.securityApiUrl;
    private apiUrl = `${this.apiBaseUrl}/Paises/`;


  constructor(private http: HttpClient) {}

  obtenerPaises(): Observable<Pais[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data as Pais[])
    );
  }
}
