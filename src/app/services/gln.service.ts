import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ Interfaces externas
import { GlnRequest } from '../interfaces/requests/gln-request';
import { GlnResponse } from '../interfaces/responses/gln-response';
import { ApiResponse } from '../interfaces/responses/api-response';

export interface UpdateGlnClientesCodigoRequest {
  idPrefijos: number;
  clientesCodigo: number;
}

@Injectable({
  providedIn: 'root'
})
export class GlnService {
  private apiBaseUrl = environment.clientsUrl;

  constructor(private http: HttpClient) { }

  insertarGln(data: { request: GlnRequest }): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/Gln`, data);
  }

  actualizarGln(id: number, data: GlnRequest): Observable<any> {
    return this.http.put(`${this.apiBaseUrl}/Gln/${id}`, data);
  }

  obtenerGlnPorId(id: number): Observable<ApiResponse<GlnResponse>> {
    return this.http.get<ApiResponse<GlnResponse>>(`${this.apiBaseUrl}/Gln/${id}`);
  }

  eliminarGln(id: number): Observable<any> {
    return this.http.delete(`${this.apiBaseUrl}/Gln/${id}`);
  }

  obtenerGlnPorClienteCodigo(clienteCodigo: number): Observable<GlnResponse[]> {
    return this.http.get<GlnResponse[]>(`${this.apiBaseUrl}/Gln/cliente/${clienteCodigo}`);
  }

  obtenerTodos(): Observable<GlnResponse[]> {
    return this.http.get<GlnResponse[]>(`${this.apiBaseUrl}/Gln`);
  }

  obtenerGlnPorIdPrefijo(idPrefijos: number): Observable<GlnResponse[]> {
    return this.http
      .get<ApiResponse<GlnResponse[]>>(`${this.apiBaseUrl}/Gln/prefijo/${idPrefijos}`)
      .pipe(map((resp: ApiResponse<GlnResponse[]>) => resp.data || []));
  }

  obtenerUltimaSecuenciaGln(codigoPais: string, prefijo: string): Observable<number> {
    const url = `${this.apiBaseUrl}/Gln/ultima-secuencia?codigoPais=${codigoPais}&prefijo=${prefijo}`;
    return this.http.get<number>(url);
  }

  obtenerGlnsPorCliente(clienteCodigo: number): Observable<ApiResponse<GlnResponse[]>> {
    return this.http.get<ApiResponse<GlnResponse[]>>(`${this.apiBaseUrl}/Gln/cliente/${clienteCodigo}`);
  }

  // ✅ NUEVO: Eliminar por id_prefijos
  eliminarGlnPorIdPrefijos(idPrefijos: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiBaseUrl}/Gln/por-idprefijos/${idPrefijos}`);
  }

  actualizarGlnClientesCodigoPorIdPrefijo(
    payload: UpdateGlnClientesCodigoRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiBaseUrl}/Gln/actualizar-clientecodigo-por-idprefijo`,
      payload
    );
  }


}

export { GlnRequest } from '../interfaces/requests/gln-request';
export { GlnResponse } from '../interfaces/responses/gln-response';
