import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';


export interface ReporteListadoGeneralQuery {
  idEmpresa: number;

  periodoInicial: string;
  periodoFinal: string;

  tipoListado: 'AREAS' | 'DEPARTAMENTOS';

  idInicial?: number | null;
  idFinal?: number | null;
  idEmpleado?: number | null;
}


@Injectable({
  providedIn: 'root'
})
export class ReporteNominaService {

  private readonly apiUrl =
    `${environment.nominaUrl}/reportes-nomina`;


  constructor(
    private readonly http: HttpClient
  ) { }


  // =============================================================
  // PDF DETALLE
  //
  // Equivalente:
  // Listado2.rpt / ListRolDep.rpt
  // =============================================================

  generarDetallePdf(
    query: ReporteListadoGeneralQuery
  ): Observable<Blob> {

    const params =
      this.construirParametros(query);

    return this.http.get(
      `${this.apiUrl}/listado-general/detalle/pdf`,
      {
        params,
        responseType: 'blob'
      }
    );
  }


  // =============================================================
  // PDF RESUMEN
  //
  // Equivalente:
  // NomIDAcu.rpt
  // =============================================================

  generarResumenPdf(
    query: ReporteListadoGeneralQuery
  ): Observable<Blob> {

    const params =
      this.construirParametros(query);

    return this.http.get(
      `${this.apiUrl}/listado-general/resumen/pdf`,
      {
        params,
        responseType: 'blob'
      }
    );
  }


  // =============================================================
  // OPCIONAL
  //
  // Descarga ZIP con los dos reportes.
  // =============================================================

  generarReportesZip(
    query: ReporteListadoGeneralQuery
  ): Observable<Blob> {

    const params =
      this.construirParametros(query);

    return this.http.get(
      `${this.apiUrl}/listado-general/reportes`,
      {
        params,
        responseType: 'blob'
      }
    );
  }


  // =============================================================
  // PARAMETROS
  // =============================================================

  private construirParametros(
    query: ReporteListadoGeneralQuery
  ): HttpParams {

    let params =
      new HttpParams()
        .set(
          'idEmpresa',
          query.idEmpresa.toString()
        )
        .set(
          'periodoInicial',
          query.periodoInicial
        )
        .set(
          'periodoFinal',
          query.periodoFinal
        )
        .set(
          'tipoListado',
          query.tipoListado
        );


    if (
      query.idInicial !== null
      &&
      query.idInicial !== undefined
    ) {

      params =
        params.set(
          'idInicial',
          query.idInicial.toString()
        );
    }


    if (
      query.idFinal !== null
      &&
      query.idFinal !== undefined
    ) {

      params =
        params.set(
          'idFinal',
          query.idFinal.toString()
        );
    }


    if (
      query.idEmpleado !== null
      &&
      query.idEmpleado !== undefined
    ) {

      params =
        params.set(
          'idEmpleado',
          query.idEmpleado.toString()
        );
    }


    return params;
  }
}