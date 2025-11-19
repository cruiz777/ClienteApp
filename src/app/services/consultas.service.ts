import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

interface RucResponse {
  ok: boolean;
  consulta: Array<{
    numeroRuc: string;
    razonSocial: string;
    tipoContribuyente: string;
    estadoContribuyenteRuc: string;
  }>;
}

interface CedulaResponse {
  ok: boolean;
  consulta: {
    cedula: string;
    nombre: string;
    calleDomicilio: string;
    numeracionDomicilio: string;
    lugarDomicilio: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConsultaSriService {
  private rucUrl = `${environment.rucUlr}`;
  private cedulaUrl = `${environment.cedulaUrl}`;

  constructor(private http: HttpClient) {}

  consultarRuc(ruc: string): Observable<RucResponse> {
    return this.http.get<RucResponse>(`${this.rucUrl}${ruc}`);
  }

  consultarCedula(cedula: string): Observable<CedulaResponse> {
    return this.http.get<CedulaResponse>(`${this.cedulaUrl}${cedula}`);
  }
}