import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface UpdateClientesCodigoByIdPrefijosRequest {
  idPrefijos: number;
  clientesCodigo: number;
}


export interface Codigos14Request {
  id_codigos14: number;
  codbar: string;
  id_prefijos: number;
  clientes_codigo: number;
  presentacion: number;
  unidad: any;
  descripcion: string;
  g14: string;
  largo: number;
  ancho: number;
  profundidad: number;
  peso: number;
  fecha: string;
  foto: string;
  activo: boolean;
  id_usuario: number;
  codpro: string;
  facturar: string;
  nombre: string;
  gtin: string;
  target: string;
  marca: string;
  sector: string;
  referencia: string;
  abrevia: string;
  id_producto: number;
}


export interface Codigos14Response {
  id_codigos14: number;
  codbar: string;
  id_prefijos: number;
  clientes_codigo: number;
  presentacion: number;
  unidad: number;
  descripcion: string;
  g14: string;
  largo: number;
  ancho: number;
  profundidad: number;
  peso: number;
  fecha: string;
  foto: string;
  activo: boolean;
  id_usuario: number;
  codpro: string;
  facturar: string;
  nombre: string;
  gtin: string;
  target: string;
  marca: string;
  sector: string;
  referencia: string;
  abrevia: string;
  id_producto: number;
  codpre: string;
  cliente: string;
}

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number | null;
}


// src/app/models/actualizar-codigo14-request.model.ts
export interface ActualizarCodigo14Request {
  codbar: string;
  clientesCodigoOriginal: number;
  clientesCodigoNuevo: number;
  idPrefijosNuevo: number;
}


@Injectable({
  providedIn: 'root'
})
export class Codigos14Service {
  private baseUrl = environment.invoicesUrl;

  constructor(private http: HttpClient) { }

  getPorGtin(gtin: string): Observable<Codigos14Response[]> {
    return this.http
      .get<ApiResponse<Codigos14Response[]>>(`${this.baseUrl}/Codigos14/Codigos14-codbar/${gtin}`)
      .pipe(
        map(response => response.data ?? [])
      );
  }
  createCodigo14(data: Codigos14Request): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(`${this.baseUrl}/Codigos14`, data);
  }

  contarPorCodbar(codbar: string): Observable<number> {
    const url = `${this.baseUrl}/Codigos14/contar?codbar=${encodeURIComponent(codbar)}`;
    return this.http.get<ApiResponse<number>>(url).pipe(
      map(response => response.data ?? 0)
    );
  }

  obtenerPorG14(g14: string): Observable<Codigos14Response[]> {
    const url = `${this.baseUrl}/Codigos14/por-g14/${encodeURIComponent(g14)}`;
    return this.http.get<ApiResponse<Codigos14Response[]>>(url).pipe(
      map(response => response.data ?? [])
    );
  }

actualizarCamposBasicos(data: Partial<Codigos14Request>): Observable<ApiResponse<boolean>> {
  const url = `${this.baseUrl}/Codigos14/${data.id_codigos14}`;

  const body = {
    descripcion: data.descripcion,
    presentacion: data.presentacion,
    unidad: data.unidad,
    fecha: data.fecha,
    activo: data.activo
  };

  return this.http.put<ApiResponse<boolean>>(url, body);
}

actualizarClientesCodigo14PorIdPrefijos(
  data: UpdateClientesCodigoByIdPrefijosRequest
): Observable<ApiResponse<boolean>> {
  const url = `${this.baseUrl}/Codigos14/actualizar-idprefijos`;
  return this.http.put<ApiResponse<boolean>>(url, data);

}

actualizarClientesCodigo14PorCodbar(data: ActualizarCodigo14Request): Observable<ApiResponse<boolean>> {
  const url = `${this.baseUrl}/Codigos14/actualizar-codigos14-por-codbar`;
  return this.http.put<ApiResponse<boolean>>(url, data);
}

}
