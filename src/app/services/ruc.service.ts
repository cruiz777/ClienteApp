import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RucService {
  private apiUrl = 'http://10.10.7.4:8080/api/services/ruc/';

  constructor(private http: HttpClient) {}

  obtenerDatosRuc(ruc: string): Observable<{ numeroRuc: string, razonSocial: string, nombre: string }> {
    return this.http.get<any>(`${this.apiUrl}${ruc}`).pipe(
      map(res => {
        const data = res.consulta?.[0];
        return {
          numeroRuc: data.numeroRuc,
          razonSocial: data.razonSocial,
          nombre: data.representantesLegales?.[0]?.nombre || ''
        };
      })
    );
  }
}
