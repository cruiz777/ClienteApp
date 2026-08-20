import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/* ============================================================
   TIPOS REPORTE GENERAL
============================================================ */

export type AgrupacionReporte =
  | 'ZONA'
  | 'DEPARTAMENTO'
  | 'CARGO'
  | 'TIPO_EMPLEADO'
  | 'RANGO_ANIOS'
  | 'ENTRADA_SALIDA';

/* ============================================================
   RESPONSE GENÉRICO API
============================================================ */

export interface ApiResponse<T> {
  id?: string;
  type: string;
  data: T;
  message: string;
}

/* ============================================================
   CATÁLOGOS
============================================================ */

export interface CatalogoReporte {
  id: number;
  nombre: string;
}

/* ============================================================
   REQUEST REPORTE EMPLEADOS
============================================================ */

export interface ReporteEmpleadosRequest {
  idEmpresa: number | null;
  idLocalDesde: number | null;
  idLocalHasta: number | null;
  idCargoDesde: number | null;
  idCargoHasta: number | null;
  idsZonas: number[];
  idsTiposEmpleado: number[];
  agrupadoPor: AgrupacionReporte;
}

/* ============================================================
   HISTORIAL CONTRATOS
============================================================ */

export interface HistorialContratoResponse {
  idCronologia: number;
  nroContrato: number;
  idTipoContrato: number | null;
  tipoContrato: string;
  fechaIngreso: string | null;
  fechaSalida: string | null;
  fechaTerminacionContrato: string | null;
  horasContrato: number | null;
}

/* ============================================================
   RESPONSE EMPLEADO GENERAL
============================================================ */

export interface ReporteEmpleadoResponse {
  idEmpleado: number;
  cedula: string;
  empleado: string;
  apellidos: string;
  nombres: string;

  idLocal: number | null;
  local: string;

  idDepartamento: number | null;
  departamento: string;

  idCargo: number;
  cargo: string;

  idTipoEmpleado: number;
  tipoEmpleado: string;

  idZona: number | null;
  zona: string;

  sueldo: number;

  fechaIngreso: string | null;
  fechaSalida: string | null;

  tiempoAnios: number;
  tiempoMeses: number;
  diasTrabajadosAcumulados: number;
  rangoAnios: string;

  historial: HistorialContratoResponse[];
}

/* ============================================================
   DATA REPORTE EMPLEADOS
============================================================ */

export interface ReporteEmpleadosDataResponse {
  agrupadoPor: string;
  totalEmpleados: number;
  empleados: ReporteEmpleadoResponse[];
}

/* ============================================================
   REQUEST CARGAS
============================================================ */

export interface ReporteCargasRequest {
  anio: number;
  idEmpresa: number | null;
  idLocalDesde: number | null;
  idLocalHasta: number | null;
  idCargoDesde: number | null;
  idCargoHasta: number | null;
  idsZonas: number[];
  idTiposEmpleado: number[];
}

/* ============================================================
   RESPONSE CARGAS - DETALLE
============================================================ */

export interface ReporteCargaDetalleResponse {
  idEmpleado: number;
  cedulaEmpleado: string;
  empleado: string;

  idCarga: number;
  nombreCarga: string;
  apellidoCarga: string;
  identificacionCarga: string;

  direccion: string;
  telefono: string;
  parentesco: string;

  fechaNacimiento: string | null;
  edadAlCierre: number;

  idLocal: number | null;
  idCargo: number;
  idTipoEmpleado: number;
}

/* ============================================================
   RESPONSE CARGAS - RESUMEN
============================================================ */

export interface ReporteCargaResumenResponse {
  idEmpleado: number;
  cedulaEmpleado: string;
  empleado: string;

  conyuges: number;

  /*
   * Si en tu C# todavía se llama:
   * HijosMenores18
   * déjalo así.
   *
   * Si ya cambiaste la propiedad en C# a:
   * Hijos
   * entonces aquí también cambia a:
   * hijos: number;
   */
  hijosMenores18: number;

  totalCargas: number;
  anio: number;
}

/* ============================================================
   CUMPLEAÑOS - REQUEST
============================================================ */

export interface ReporteCumpleaniosRequest {
  fechaDesde: string | null;
  fechaHasta: string | null;
  idEmpresa: number | null;
}

/* ============================================================
   CUMPLEAÑOS - EMPLEADO
============================================================ */

export interface ReporteCumpleaniosEmpleadoResponse {
  idEmpleado: number;
  cedula: string;
  empleado: string;

  fechaNacimiento: string | null;

  dia: number;
  mes: number;
  edad: number;

  idLocal: number | null;
  local: string;

  idCargo: number;
  cargo: string;

  idZona: number | null;
  zona: string;

  idTipoEmpleado: number;
  tipoEmpleado: string;
}

/* ============================================================
   CUMPLEAÑOS - DATA RESPONSE
============================================================ */

export interface ReporteCumpleaniosDataResponse {
  totalEmpleados: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  empleados: ReporteCumpleaniosEmpleadoResponse[];
}

/* ============================================================
   FONDOS DE RESERVA - REQUEST
============================================================ */

export interface ReporteFondosReservaRequest {
  fechaPeriodo: string;
  idEmpresa: number | null;
}

/* ============================================================
   FONDOS DE RESERVA - RESPONSE
============================================================ */

export interface ReporteFondosReservaResponse {
  idEmpleado: number;
  cedula: string;
  apellidos: string;
  nombres: string;

  fechaIngreso1: string | null;
  fechaSalida1: string | null;

  fechaIngreso2: string | null;
  fechaSalida2: string | null;

  fechaIngreso3: string | null;
  fechaSalida3: string | null;

  diasAcumulados: number;
  periodo: string;
}
/* ============================================================
   CATÁLOGO EMPLEADOS REPORTE
============================================================ */

export interface CatalogoEmpleadoReporte {
  idEmpleado: number;
  cedula: string;
  empleado: string;
}

/* ============================================================
   GASTOS PERSONALES - REQUEST
============================================================ */

export interface ReporteGastosPersonalesRequest {
  idEmpleado: number | null;
  idEmpresa: number | null;
}

/* ============================================================
   GASTOS PERSONALES - RESPONSE
============================================================ */

export interface ReporteGastosPersonalesResponse {
  idEmpleado: number;

  cedula: string;
  apellidos: string;
  nombres: string;

  viviendaProyectado: number;
  viviendaReal: number;

  alimentacionProyectado: number;
  alimentacionReal: number;

  vestimentaProyectado: number;
  vestimentaReal: number;

  educacionProyectado: number;
  educacionReal: number;

  saludProyectado: number;
  saludReal: number;

  turismoProyectado: number;
  turismoReal: number;

  enfermedadCatastroficaProyectado: number;
  enfermedadCatastroficaReal: number;
}
/* ============================================================
   SERVICE
============================================================ */

@Injectable({
  providedIn: 'root'
})
export class ReportesEmpleadosService {
  private readonly baseUrl =
    `${environment.employeesUrl}/Reportes`;

  constructor(
    private readonly http: HttpClient
  ) { }

  /* ==========================================================
     CATÁLOGO LOCALES
  ========================================================== */

  obtenerLocales(): Observable<ApiResponse<CatalogoReporte[]>> {
    return this.http.get<ApiResponse<CatalogoReporte[]>>(
      `${this.baseUrl}/locales`
    );
  }

  /* ==========================================================
     CATÁLOGO CARGOS
  ========================================================== */

  obtenerCargos(): Observable<ApiResponse<CatalogoReporte[]>> {
    return this.http.get<ApiResponse<CatalogoReporte[]>>(
      `${this.baseUrl}/cargos`
    );
  }

  /* ==========================================================
     CATÁLOGO ZONAS
  ========================================================== */

  obtenerZonas(): Observable<ApiResponse<CatalogoReporte[]>> {
    return this.http.get<ApiResponse<CatalogoReporte[]>>(
      `${this.baseUrl}/zonas`
    );
  }

  /* ==========================================================
     CATÁLOGO TIPOS EMPLEADO
  ========================================================== */

  obtenerTiposEmpleado(): Observable<ApiResponse<CatalogoReporte[]>> {
    return this.http.get<ApiResponse<CatalogoReporte[]>>(
      `${this.baseUrl}/tipos-empleado`
    );
  }

  /* ==========================================================
     REPORTE GENERAL EMPLEADOS
  ========================================================== */

  generarReporteEmpleados(
    request: ReporteEmpleadosRequest
  ): Observable<ApiResponse<ReporteEmpleadosDataResponse>> {
    return this.http.post<ApiResponse<ReporteEmpleadosDataResponse>>(
      `${this.baseUrl}/reporte-empleados`,
      request
    );
  }

  /* ==========================================================
     REPORTE GENERAL EMPLEADOS PDF
  ========================================================== */

  generarReporteEmpleadosPdf(
    request: ReporteEmpleadosRequest
  ): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/reporte-empleados/pdf`,
      request,
      {
        responseType: 'blob'
      }
    );
  }

  /* ==========================================================
     REPORTE CUMPLEAÑOS
  ========================================================== */

  consultarCumpleanios(
    request: ReporteCumpleaniosRequest
  ): Observable<ApiResponse<ReporteCumpleaniosDataResponse>> {
    return this.http.post<ApiResponse<ReporteCumpleaniosDataResponse>>(
      `${this.baseUrl}/cumpleanios`,
      request
    );
  }

  /* ==========================================================
     CARGAS FAMILIARES - DETALLE
  ========================================================== */

  consultarCargasDetalle(
    request: ReporteCargasRequest
  ): Observable<ApiResponse<ReporteCargaDetalleResponse[]>> {
    return this.http.post<ApiResponse<ReporteCargaDetalleResponse[]>>(
      `${this.baseUrl}/reporte-cargas/detalle`,
      request
    );
  }

  /* ==========================================================
     CARGAS FAMILIARES - RESUMEN
  ========================================================== */

  consultarCargasResumen(
    request: ReporteCargasRequest
  ): Observable<ApiResponse<ReporteCargaResumenResponse[]>> {
    return this.http.post<ApiResponse<ReporteCargaResumenResponse[]>>(
      `${this.baseUrl}/reporte-cargas/resumen`,
      request
    );
  }
  /* ==========================================================
   FONDOS DE RESERVA - CONSULTA
========================================================== */

  consultarFondosReserva(
    request: ReporteFondosReservaRequest
  ): Observable<ApiResponse<ReporteFondosReservaResponse[]>> {

    return this.http.post<
      ApiResponse<ReporteFondosReservaResponse[]>
    >(
      `${this.baseUrl}/fondos-reserva`,
      request
    );
  }

  /* ==========================================================
     FONDOS DE RESERVA - PDF
  ========================================================== */

  generarFondosReservaPdf(
    request: ReporteFondosReservaRequest
  ): Observable<Blob> {

    return this.http.post(
      `${this.baseUrl}/fondos-reserva/pdf`,
      request,
      {
        responseType: 'blob'
      }
    );
  }
  /* ==========================================================
   EMPLEADOS PARA REPORTES
========================================================== */

obtenerEmpleadosReporte():
  Observable<
    ApiResponse<
      CatalogoEmpleadoReporte[]
    >
  > {

  return this.http.get<
    ApiResponse<
      CatalogoEmpleadoReporte[]
    >
  >(
    `${this.baseUrl}/empleados`
  );
}

/* ==========================================================
   GASTOS PERSONALES - CONSULTA
========================================================== */

consultarGastosPersonales(
  request:
    ReporteGastosPersonalesRequest
): Observable<
  ApiResponse<
    ReporteGastosPersonalesResponse[]
  >
> {

  return this.http.post<
    ApiResponse<
      ReporteGastosPersonalesResponse[]
    >
  >(
    `${this.baseUrl}/gastos-personales`,
    request
  );
}

/* ==========================================================
   GASTOS PERSONALES - PDF
========================================================== */

generarGastosPersonalesPdf(
  request:
    ReporteGastosPersonalesRequest
): Observable<Blob> {

  return this.http.post(
    `${this.baseUrl}/gastos-personales/pdf`,
    request,
    {
      responseType: 'blob'
    }
  );
}
}