import {
  Injectable
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from 'src/environments/environment';

import {
  ApiResponse
} from 'src/app/interfaces/responses/api-response';


/* =============================================================
   LISTADO GENERAL
============================================================= */

export interface ReporteListadoGeneralQuery {

  idEmpresa: number;

  periodoInicial: string;

  periodoFinal: string;

  tipoListado:
    'AREAS'
    |
    'DEPARTAMENTOS';

  idInicial?:
    number | null;

  idFinal?:
    number | null;

  idEmpleado?:
    number | null;

}


/* =============================================================
   PROVISIONES - REQUEST
============================================================= */

export interface ReporteProvisionesRequest {

  fechaPeriodo: string;

}


/* =============================================================
   PROVISIONES - DETALLE
============================================================= */

export interface ReporteProvisionRow {

  idEmpleado: number;

  cedula: string;

  nombres: string;

  area: string;


  dias: number;

  sueldo: number;


  fechaIngreso1:
    string | null;

  fechaSalida1:
    string | null;


  fechaIngreso2:
    string | null;

  fechaSalida2:
    string | null;


  fechaIngreso3:
    string | null;

  fechaSalida3:
    string | null;


  diasFondos: number;


  aporte: number;

  decimoCuarto: number;

  decimoTercero: number;

  fondosReserva: number;

  iece: number;

  secap: number;


  diasVacaciones: number;

  vacaciones: number;


  grupo: string;

}


/* =============================================================
   PROVISIONES - TOTALES
============================================================= */

export interface ReporteProvisionesTotales {

  sueldo: number;

  aporte: number;

  decimoCuarto: number;

  decimoTercero: number;

  fondosReserva: number;

  iece: number;

  secap: number;

  vacaciones: number;

}


/* =============================================================
   PROVISIONES - RESPONSE
============================================================= */

export interface ReporteProvisionesResponse {

  fechaPeriodo: string;


  empleadosGenerales:
    ReporteProvisionRow[];


  pasantesBecarios:
    ReporteProvisionRow[];


  totalGenerales:
    ReporteProvisionesTotales;


  totalPasantesBecarios:
    ReporteProvisionesTotales;

}


/* =============================================================
   PERSONAL OCUPADO - REQUEST
============================================================= */

export interface ReportePersonalOcupadoRequest {

  mes: number;

  anio: number;

  agrupadoPor:
    'contrato'
    |
    'edad'
    |
    'horas';

}


/* =============================================================
   PERSONAL OCUPADO - FILA
============================================================= */

export interface PersonalOcupadoRow {

  idGrupoOcupacional:
    number | null;

  grupo:
    string;


  // ===========================================================
  // CONTRATO - DISCAPACIDAD
  // ===========================================================

  sinDiscapacidadH:
    number;

  sinDiscapacidadM:
    number;

  conDiscapacidadH:
    number;

  conDiscapacidadM:
    number;


  // ===========================================================
  // CONTRATO
  // ===========================================================

  permanenteCompletoH:
    number;

  permanenteCompletoM:
    number;

  permanenteParcialH:
    number;

  permanenteParcialM:
    number;

  temporalH:
    number;

  temporalM:
    number;

  permanenteH:
    number;

  totalH:
    number;

  totalM:
    number;

  total:
    number;


  // ===========================================================
  // EDAD
  // ===========================================================

  menorIgual11H:
    number;

  menorIgual11M:
    number;

  de12A17H:
    number;

  de12A17M:
    number;

  de18A29H:
    number;

  de18A29M:
    number;

  de30A64H:
    number;

  de30A64M:
    number;

  mayor64H:
    number;

  mayor64M:
    number;


  // ===========================================================
  // HORAS / SALARIOS
  // ===========================================================

  horasNormales:
    number;

  horasExtras:
    number;

  totalHoras:
    number;


  sueldoMesH:
    number;

  sueldoMesM:
    number;

  sueldoMesTotal:
    number;


  sueldoAnioH:
    number;

  sueldoAnioM:
    number;

  sueldoAnioTotal:
    number;

}


/* =============================================================
   PERSONAL OCUPADO - RESPONSE
============================================================= */

export interface ReportePersonalOcupadoResponse {

  mes:
    number;

  anio:
    number;

  agrupadoPor:
    string;

  filas:
    PersonalOcupadoRow[];

  totales:
    PersonalOcupadoRow;

}


/* =============================================================
   SERVICE
============================================================= */

@Injectable({
  providedIn: 'root'
})
export class ReporteNominaService {

  private readonly apiUrl =
    `${environment.nominaUrl}/reportes-nomina`;


  constructor(
    private readonly http:
      HttpClient
  ) {}


  // =============================================================
  // PDF DETALLE
  //
  // Listado2.rpt / ListRolDep.rpt
  // =============================================================

  generarDetallePdf(
    query:
      ReporteListadoGeneralQuery
  ): Observable<Blob> {

    const params =
      this.construirParametros(
        query
      );


    return this.http.get(
      `${this.apiUrl}/listado-general/detalle/pdf`,
      {
        params:
          params,

        responseType:
          'blob'
      }
    );

  }


  // =============================================================
  // PDF RESUMEN
  //
  // NomIDAcu.rpt
  // =============================================================

  generarResumenPdf(
    query:
      ReporteListadoGeneralQuery
  ): Observable<Blob> {

    const params =
      this.construirParametros(
        query
      );


    return this.http.get(
      `${this.apiUrl}/listado-general/resumen/pdf`,
      {
        params:
          params,

        responseType:
          'blob'
      }
    );

  }


  // =============================================================
  // ZIP
  //
  // Resumen + Detalle
  // =============================================================

  generarReportesZip(
    query:
      ReporteListadoGeneralQuery
  ): Observable<Blob> {

    const params =
      this.construirParametros(
        query
      );


    return this.http.get(
      `${this.apiUrl}/listado-general/reportes`,
      {
        params:
          params,

        responseType:
          'blob'
      }
    );

  }


  // =============================================================
  // REPORTE PROVISIONES
  //
  // POST:
  //
  // api/reportes-nomina/provisiones
  //
  // BODY:
  //
  // {
  //   "fechaPeriodo": "2026-04-01"
  // }
  // =============================================================

  consultarProvisiones(
    request:
      ReporteProvisionesRequest
  ):
    Observable<
      ApiResponse<
        ReporteProvisionesResponse
      >
    > {

    return this.http.post<
      ApiResponse<
        ReporteProvisionesResponse
      >
    >(
      `${this.apiUrl}/provisiones`,
      request
    );

  }


  // =============================================================
  // PARAMETROS LISTADO GENERAL
  // =============================================================

  private construirParametros(
    query:
      ReporteListadoGeneralQuery
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

// =============================================================
// REPORTE PERSONAL OCUPADO
//
// POST:
//
// api/reportes-nomina/personal-ocupado
//
// BODY:
//
// {
//   "mes": 4,
//   "anio": 2026,
//   "agrupadoPor": "contrato"
// }
// =============================================================

consultarPersonalOcupado(
  request:
    ReportePersonalOcupadoRequest
):
  Observable<
    ApiResponse<
      ReportePersonalOcupadoResponse
    >
  > {

  return this.http.post<
    ApiResponse<
      ReportePersonalOcupadoResponse
    >
  >(
    `${this.apiUrl}/personal-ocupado`,
    request
  );

}

}