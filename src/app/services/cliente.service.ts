import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Cliente } from '../interfaces/cliente';
import { environment } from 'src/environments/environment';

interface ClienteResponse {
  id: string;
  type: string;
  data: Cliente[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiBaseUrl = environment.applicationUrl;
  private apiUrl = `${this.apiBaseUrl}/Clientes/`;

  constructor(private http: HttpClient) {}

  getClientes(): Observable<Cliente[]> {
    return this.http.get<ClienteResponse>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }
}
