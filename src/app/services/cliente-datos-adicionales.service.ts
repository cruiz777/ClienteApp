import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // ✅ este es el que te faltaba

export interface ClienteDatosAdicionales {
  idDatosAdicionales: number;
  expprod?: boolean;
  vendeus?: boolean;
  medico?: boolean;
  gs1ec?: boolean;
  instagram?: boolean;
  facebook?: boolean;
  web?: boolean;
  clientes_codigo: number;
  prefijo?: boolean;
  guia?: boolean;
  otros?: boolean;
  estado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteDatosAdicionalesService {
  private apiBaseUrl = environment.clientsUrl;

  constructor(private http: HttpClient) {}

  crear(datos: ClienteDatosAdicionales): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/ClienteDatosAdicionales`, datos);
  }

  obtenerPorClienteCodigo(clientesCodigo: number): Observable<ClienteDatosAdicionales> {
    return this.http
      .get<{ type: string; data: ClienteDatosAdicionales; message: string }>(
        `${this.apiBaseUrl}/ClienteDatosAdicionales/por-clientecodigo/${clientesCodigo}`
      )
      .pipe(
        map((response) => response.data)
      );
  }

  actualizarPorClienteCodigo(clientesCodigo: number, datos: ClienteDatosAdicionales): Observable<any> {
    return this.http.put(`${this.apiBaseUrl}/ClienteDatosAdicionales/por-cliente/${clientesCodigo}`, datos);
  }
}
