import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ Interfaces externas
import { GlnRequest } from '../interfaces/requests/gln-request';
import { GlnResponse } from '../interfaces/responses/gln-response';

@Injectable({
  providedIn: 'root'
})
export class GlnService {
  private apiBaseUrl = environment.clientsUrl;

  constructor(private http: HttpClient) {}

  // ✅ POST /Gln
  insertarGln(data: { request: GlnRequest }): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/Gln`, data);
  }

  // ✅ PUT /Gln/{id}
  actualizarGln(id: number, data: GlnRequest): Observable<any> {
    return this.http.put(`${this.apiBaseUrl}/Gln/${id}`, data);
  }

  // ✅ GET /Gln/{id}
  obtenerGlnPorId(id: number): Observable<GlnResponse> {
    return this.http.get<GlnResponse>(`${this.apiBaseUrl}/Gln/${id}`);
  }

  // ✅ DELETE /Gln/{id}
  eliminarGln(id: number): Observable<any> {
    return this.http.delete(`${this.apiBaseUrl}/Gln/${id}`);
  }

  // ✅ GET /Gln/cliente/{clienteCodigo}
  obtenerGlnPorClienteCodigo(clienteCodigo: number): Observable<GlnResponse[]> {
    return this.http.get<GlnResponse[]>(`${this.apiBaseUrl}/Gln/cliente/${clienteCodigo}`);
  }

  // ✅ GET /Gln
  obtenerTodos(): Observable<GlnResponse[]> {
    return this.http.get<GlnResponse[]>(`${this.apiBaseUrl}/Gln`);
  }
}

// ✅ Reexportar para que puedan importarse desde aquí
export { GlnRequest } from '../interfaces/requests/gln-request';
export { GlnResponse } from '../interfaces/responses/gln-response';
