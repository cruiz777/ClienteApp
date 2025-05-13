import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';

export interface HistorialClienteRequest {
  id_historial_cliente: number;
  id_usuario: number;
  nombre_usuario: string;
  fecha: string;
  descripcion: string;
  clientes_codigo: number;
  cliente?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistorialClienteService {
  private apiBaseUrl = environment.clientsUrl;
  private apiUrl = `${this.apiBaseUrl}`;

  constructor(private http: HttpClient) {}

  insertarHistorialCliente(request: HistorialClienteRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/HistorialCliente`, request);
  }

obtenerHistorialPorCliente(clientes_codigo: number): Observable<HistorialClienteRequest[]> {
  const params = new HttpParams().set('clientesCodigo', clientes_codigo.toString());

  return this.http.get<any>(`${this.apiUrl}/listadoHistorialcliente`, { params }).pipe(
    map(response => response.data) // 👈 accede a solo el array
  );
}


}
