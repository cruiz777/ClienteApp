import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ResumenInecService {

  private readonly apiUrl =
    `${environment.nominaUrl}/reportes-nomina`;

  constructor(
    private readonly http: HttpClient
  ) {}

  generarPdf(
    idEmpresa: number,
    anio: number,
    mes: number
  ): Observable<Blob> {

    const params = new HttpParams()
      .set('idEmpresa', idEmpresa.toString())
      .set('anio', anio.toString())
      .set('mes', mes.toString());

    return this.http.get(
      `${this.apiUrl}/inec/pdf`,
      {
        params,
        responseType: 'blob'
      }
    );
  }
}