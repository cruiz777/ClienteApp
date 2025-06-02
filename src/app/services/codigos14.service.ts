import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

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


@Injectable({
  providedIn: 'root'
})
export class Codigos14Service {
  private baseUrl = environment.invoicesUrl;

  constructor(private http: HttpClient) {}

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



}
