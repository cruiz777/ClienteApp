import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CedulaService {
  private baseUrl = 'http://pichincha.gapsystem.net:10048/api/services/cedula/';

  constructor(private http: HttpClient) {}

  obtenerDatosCedula(cedula: string): Observable<{ nombreCompleto: string }> {
    const url = `${this.baseUrl}${cedula}`;

    return this.http.get<any>(url).pipe(
      map(res => {
        return { nombreCompleto: res.consulta.nombreCompleto };
      })
    );
  }
}
