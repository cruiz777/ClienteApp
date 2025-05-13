import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RucApiResponse, RucConsulta } from '../interfaces/responses/RucResponse';

@Injectable({
  providedIn: 'root'
})
export class ConsultaRucService {
  private backendUrl = environment.securityApiUrl;

  constructor(private http: HttpClient) {}

  consultarRuc(ruc: string): Observable<RucConsulta> {
    const nombreApi = 'ruc';
    const url = `${this.backendUrl}/apis-externas/${nombreApi}/consultar?parametro=${ruc}`;

    return this.http.get<RucApiResponse>(url).pipe(
      map((response: RucApiResponse) => {
        if (!response.ok || !response.consulta || response.consulta.length === 0) {
          throw new Error('No se encontraron resultados para el RUC ingresado.');
        }
        return response.consulta[0]; // Retorna solo el primer resultado
      })
    );
  }
}
