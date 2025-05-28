import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // ✅ este es el que te faltaba
import { stream } from 'exceljs';

export interface ClienteContacto {
  id_ContactosClientes: number;
  Nombre: string;
  telefono: string; // puede ser Date si usas transformación
  email: string;
  cargo:string;
  clientesCodigo: number;
  linea: number;
}



@Injectable({
  providedIn: 'root'
})
export class ClienteContactoService {
  private apiBaseUrl = environment.clientsUrl;

  constructor(private http: HttpClient) { }

  // Obtener todas las observaciones
  getAll(): Observable<ClienteContacto[]> {
    return this.http.get<ClienteContacto[]>(`${this.apiBaseUrl}ContactoClientes`);
  }
    crear(datos: ClienteContacto): Observable<any> {
      return this.http.post(`${this.apiBaseUrl}/ContactoClientes`, datos);
    }
  // Obtener observaciones por código de cliente
 getByClienteCodigo(clientesCodigo: number): Observable<ClienteContacto[]> {
  return this.http
    .get<{ type: string; data: ClienteContacto[]; message: string }>(
      `${this.apiBaseUrl}/ContactoClientes/clientescontacto/${clientesCodigo}`
    )
    .pipe(
      map((response) => response.data)
    );
}

update(cliente: ClienteContacto): Observable<any> {
  return this.http.put(
    `${this.apiBaseUrl}/ContactoClientes/clientes/${cliente.clientesCodigo}/linea/${cliente.linea}`,
    cliente
  );
}

 
}