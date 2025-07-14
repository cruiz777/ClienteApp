import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SimplePrefijoResponse } from '../interfaces/responses/prefijo-simple';
import { PrefijoClienteResponse } from '../interfaces/responses/PrefijoClienteResponse';

export { PrefijoClienteResponse };

export interface Prefijo {
  id_prefijos: number;
  codpre: string;
  clientesCodigo: number;
  prefijosgs1?: string;
  bandera?: number;
  gln:string;
  web:string;
  prefijosgs1:string;
}

export interface ActualizarPrefijoPayload {
  fechaCierre: string | null;
  observacion: string;
  estado: boolean;
}
export interface UpdateClientesCodigoRequest {
  idPrefijos: number;
  clientesCodigo: number;
}


@Injectable({
  providedIn: 'root'
})
export class PrefijoService {

  private apiBaseUrl = environment.clientsUrl;
  // ✅ Inyección de HttpClient
  constructor(private http: HttpClient) { }

  guardarPrefijo(data: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/Prefijos`, data);
  }

  buscarPorCodpre(codpre: string): Observable<Prefijo[]> {
    const url = `${this.apiBaseUrl}/Codpre?Codpre=${encodeURIComponent(codpre)}`;
    return this.http.get<any>(url).pipe(
      map(res => res.data as Prefijo[]) // Asegura que devuelva solo el array de datos
    );
  }
  obtenerPorClienteCodigo(clientesCodigo: number): Observable<PrefijoClienteResponse[]> {
    debugger
    const params = new HttpParams().set('clientesCodigo', clientesCodigo.toString());

    return this.http.get<any>(`${this.apiBaseUrl}/CodpreCliente`, { params }).pipe(
      map(response => response.data as PrefijoClienteResponse[])
    );
  }

  actualizarPrefijo(
    id: number,
    data: { fechaCierre: string | null; observacion: string; estado: boolean }
  ): Observable<any> {
    return this.http.put(`${this.apiBaseUrl}/Prefijos/${id}`, data);
  }

  obtenerDetallePrefijo(codpre: string): Observable<PrefijoClienteResponse[]> {
    const url = `${this.apiBaseUrl}/Codpre?Codpre=${encodeURIComponent(codpre)}`;
    return this.http.get<any>(url).pipe(
      map(res => res.data as PrefijoClienteResponse[])
    );
  }
  obtenerPrefijosPorClienteCodigo(clientesCodigo: number): Observable<PrefijoClienteResponse[]> {
    return this.http.get<any>(`${this.apiBaseUrl}/CodpreCliente`, {
      params: { clientesCodigo }
    }).pipe(map(response => response.data as PrefijoClienteResponse[]));
  }
  obtenerPrefijosGlnPorClienteCodigo(clientesCodigo: number): Observable<PrefijoClienteResponse[]> {
    return this.http.get<any>(`${this.apiBaseUrl}/prefijo-gln/CodpreCliente`, {
      params: { clientesCodigo }
    }).pipe(map(response => response.data as PrefijoClienteResponse[]));
  }
  eliminarPrefijo(id: number): Observable<any> {
    return this.http.delete(`${this.apiBaseUrl}/Prefijos/${id}`);
  }

  obtenerPrefijosUnicosPorCliente(clientesCodigo: number): Observable<SimplePrefijoResponse[]> {
    return this.http.get<any>(`${this.apiBaseUrl}/prefijos/unicos/${clientesCodigo}`)
      .pipe(map(response => response.data as SimplePrefijoResponse[]));
  }
  actualizarClientesCodigoDePrefijo(idPrefijos: number, clientesCodigo: number): Observable<any> {
  return this.http.patch(`${this.apiBaseUrl}/prefijos/${idPrefijos}/cliente/${clientesCodigo}`, {});
}

actualizarOrdenDePrefijo(idPrefijos: number, orden: number): Observable<any> {
  const payload = { idPrefijos, orden };
  return this.http.put(`${this.apiBaseUrl}/prefijos/actualizar-orden-prefijo`, payload);
}


}
