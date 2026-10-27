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
  tabla?: string,
  tipo_accion?: string,
  id_empresa?: number
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

obtenerHistorialPorCliente(
  clientes_codigo: number,
  tipo_accion?: string,
  tabla?: string,
  id_empresa?: number
): Observable<HistorialClienteRequest[]> {
  let params = new HttpParams().set('clientesCodigo', clientes_codigo.toString());

  if (tipo_accion) {
    params = params.set('tipoAccion', tipo_accion);
  }

  if (tabla) {
    params = params.set('tabla', tabla);
  }

  if (id_empresa && id_empresa > 0) {
    params = params.set('idEmpresa', id_empresa.toString());
  }

  return this.http.get<any>(`${this.apiUrl}/listadoHistorialcliente`, { params }).pipe(
    map(response => response.data)
  );
}



}
