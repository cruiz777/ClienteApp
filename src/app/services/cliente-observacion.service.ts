import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';


export interface ClienteObservacion {
  id_ClienteObservacion: number;
  Detalle: string;
  fecha: string;
  idUsuario: number;
  clientesCodigo: number;
  nombreUsuario: string;
  linea: number;
}

export interface ClienteObservacionRequest {
  Detalle: string;
  Fecha: string;
  IdUsuario: number;
  NombreUsuario: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteObservacionService {
  private apiBaseUrl = environment.clientsUrl;

  constructor(private http: HttpClient) {}

  enviarObservacion(observacion: ClienteObservacion): Observable<any> {
    return this.http.post<any>(`${this.apiBaseUrl}/ClienteObservacion`, observacion);
  }

 getObservacionesPorClienteCodigo(clientesCodigo: number): Observable<ClienteObservacion[]> {
  return this.http
    .get<{ type: string; data: ClienteObservacion[]; message: string }>(
      `${this.apiBaseUrl}/ClienteObservacion/por-cliente/${clientesCodigo}`
    )
    .pipe(
      map((response) => response.data)
    );
}

 // ✅ PUT para actualizar observación por cliente + línea
  actualizarObservacion(clientesCodigo: number, linea: number, body: ClienteObservacionRequest): Observable<any> {
    return this.http.put<any>(
      `${this.apiBaseUrl}/ClienteObservacion/${clientesCodigo}/${linea}`,
      body
    );
  }

}
