import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class RucService {
    private apiUrl = environment.rucUlr;


  constructor(private http: HttpClient) {}

  obtenerDatosRuc(ruc: string): Observable<{ numeroRuc: string, razonSocial: string, nombre: string ,estadoContribuyenteRuc:string}> {
    return this.http.get<any>(`${this.apiUrl}${ruc}`).pipe(
      map(res => {
        const data = res.consulta?.[0];
        return {
          numeroRuc: data.numeroRuc,
          razonSocial: data.razonSocial,
          estadoContribuyenteRuc: data.estadoContribuyenteRuc, //
          nombre: data.representantesLegales?.[0]?.nombre || ''
        };
      })
    );
  }
}
