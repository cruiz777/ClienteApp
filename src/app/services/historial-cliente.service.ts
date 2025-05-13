import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface HistorialClienteRequest {
  id_historial_cliente: number;
  id_usuario: number;
  nombre_usuario: string;
  fecha: string;
  descripcion: string;
  clientes_codigo: number;
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
}
