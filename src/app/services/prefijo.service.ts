import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { PrefijoClienteResponse} from '../interfaces/responses/PrefijoClienteResponse';

export { PrefijoClienteResponse };

export interface Prefijo {
  id_prefijos: number;
  codpre: string;
  clientesCodigo: number;
}

export interface ActualizarPrefijoPayload {
  fechaCierre: string | null;
  observacion: string;
  estado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PrefijoService {

  private apiBaseUrl = environment.clientsUrl;

  // ✅ Inyección de HttpClient
  constructor(private http: HttpClient) {}

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

}
