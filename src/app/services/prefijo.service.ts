import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; 
import { environment } from 'src/environments/environment';

export interface Prefijo {
  id_prefijos: number;
  codpre: string;
  clientesCodigo: number;
}
export interface PrefijoClienteResponse {
  id_prefijos: number;
  codpre: string;
  fecha: string;
  fechaCierre: string;
  observacion: string;
  digitos: string;
  estado: boolean;
  control: number;
  ngln: number;
  bandera: number;
  facturar: string;
  codpro: string;
  nombre: string;
  fecfac: string;
  referenciaInterna: string;
  prefijosgs1: string;
  origenPrefijo: string;
  orden: number;
  clientesCodigo: number;
  nomcli: string;
  gln: string;
  tipoLocalizacion: string;
  estadoEmpresa: string;
  ruccli: string;
  fecing: string;
  zona: string;
  tipoCliente: string;
  grupoEmpresa: string;
  grupoProducto: string;
  representante: string;
  direccion: string;
  telefono: string;
  web: string;
  postal: string;
  provincia: string;
  canton: string;
  ciudad: string;
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
    map(response => response.data as PrefijoClienteResponse[]) // ✅ arreglo
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



}
