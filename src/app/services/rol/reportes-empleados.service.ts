import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
   TERMINACIÓN DE CONTRATO - RESPONSE
============================================================ */

export interface EmpleadoTerminacionContratoResponse {
  idEmpleado: number;
  cedula: string;
  apellidos: string;
  nombres: string;

  nroContrato: number;
  idTipoContrato: number | null;
  tipoContrato: string | null;

  fechaIngreso: string | null;
  fechaSalida: string | null;
  fechaTerminacionContrato: string | null;
}

/* ============================================================
   SERVICE
============================================================ */
/* ============================================================
   REPORTE INGRESO / SALIDA EMPLEADOS
============================================================ */

export interface EmpleadoIngresoSalidaResponse {
  idEmpleado: number;

  cedula: string;
  apellidos: string;
  nombres: string;
  empleado: string;

  nroContrato: number;

  idTipoContrato: number | null;
  tipoContrato: string | null;

  fechaIngreso: string | null;
  fechaSalida: string | null;
  fechaTerminacionContrato: string | null;

  idLocal: number | null;
  idZona: number | null;

  idCargo: number;
  idTipoEmpleado: number;

  sueldo: number | null;
}

/* ============================================================
   TIPOS DE CONTRATO POR EMPLEADO
============================================================ */

export interface ContratoEmpleadoResponse {
  idCronologia: number;
  nroContrato: number;

  idTipoContrato: number | null;
  tipoContrato: string;

  fechaIngreso: string | null;
  fechaSalida: string | null;
  fechaTerminacionContrato: string | null;

  numContrato: number | null;
  horasContrato: number | null;
}


export interface EmpleadoTipoContratoResponse {
  idEmpleado: number;

  cedula: string;

  apellidos: string;

  nombres: string;

  empleado: string;

  idCargo: number;

  cargo: string;

  totalContratos: number;

  contratos: ContratoEmpleadoResponse[];
}

export interface EmpleadoDiscapacidadResponse {

  idEmpleado: number;

  cedula: string;

  apellidos: string;

  nombres: string;

  empleado: string;

  carnetConadis: string;

  porcentajeDiscapacidad: string;

  idTipoDiscapacidad: number | null;

  tipoDiscapacidad: string;

  codigoTipoDiscapacidad: string;

  codigoCondicionDiscapacidad: string;

  descripcionDiscapacidad: string;

  cedulaDis: string;

  nombreDis: string;

  activo: boolean;

  estado: string;
}
export interface FichaActualizacionEmpleadoResponse {

  idEmpleado: number;

  cedula: string;

  nombres: string;

  apellidos: string;

  estadoCivil: string;

  sexo: string;

  fechaNacimiento: string | null;

  ciudad: string;

  direccion: string;

  telefono: string;

  celular: string;

  mail: string;

  tipoSangre: string;

  codigoSectorial: string;

  tipoEmpleado: string;

  cargo: string;

  departamento: string;

  local: string;

  banco: string;

  tipoCuenta: string;

  cuenta: string;

  tipoContrato: string;

  fechaIngreso: string | null;

  nivelInstruccion: string;

  conyuge: string;

  numeroCargas: number;
}
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


  /* ==========================================================
     TERMINACIÓN DE CONTRATO - CONSULTA
  ========================================================== */

  consultarTerminacionContrato(
    mes: number,
    anio: number,
    idTipoContrato: number | null
  ): Observable<EmpleadoTerminacionContratoResponse[]> {

    let params = new HttpParams()
      .set('mes', mes.toString())
      .set('anio', anio.toString());

    if (idTipoContrato !== null) {
      params = params.set(
        'idTipoContrato',
        idTipoContrato.toString()
      );
    }

    return this.http.get<EmpleadoTerminacionContratoResponse[]>(
      `${this.baseUrl}/terminacion-contrato`,
      { params }
    );
  }

  /* ==========================================================
     TERMINACIÓN DE CONTRATO - PDF
  ========================================================== */

  generarTerminacionContratoPdf(
    mes: number,
    anio: number,
    idTipoContrato: number | null
  ): Observable<Blob> {

    let params = new HttpParams()
      .set('mes', mes.toString())
      .set('anio', anio.toString());

    if (idTipoContrato !== null) {
      params = params.set(
        'idTipoContrato',
        idTipoContrato.toString()
      );
    }

    return this.http.get(
      `${this.baseUrl}/terminacion-contrato/pdf`,
      {
        params,
        responseType: 'blob'
      }
    );
  }
  /* ==========================================================
   EMPLEADOS INGRESO / SALIDA - CONSULTA
========================================================== */

  consultarEmpleadosIngresoSalida(
    fechaDesde: string,
    fechaHasta: string,
    tipoFecha: number
  ): Observable<EmpleadoIngresoSalidaResponse[]> {

    const params = new HttpParams()
      .set(
        'fechaDesde',
        fechaDesde
      )
      .set(
        'fechaHasta',
        fechaHasta
      )
      .set(
        'tipoFecha',
        tipoFecha.toString()
      );

    return this.http.get<
      EmpleadoIngresoSalidaResponse[]
    >(
      `${this.baseUrl}/empleados-ingreso-salida`,
      {
        params
      }
    );
  }


  /* ==========================================================
     EMPLEADOS INGRESO / SALIDA - PDF
  ========================================================== */

  generarEmpleadosIngresoSalidaPdf(
    fechaDesde: string,
    fechaHasta: string,
    tipoFecha: number
  ): Observable<Blob> {

    const params = new HttpParams()
      .set(
        'fechaDesde',
        fechaDesde
      )
      .set(
        'fechaHasta',
        fechaHasta
      )
      .set(
        'tipoFecha',
        tipoFecha.toString()
      );

    return this.http.get(
      `${this.baseUrl}/empleados-ingreso-salida/pdf`,
      {
        params,
        responseType: 'blob'
      }
    );
  }
  /* ==========================================================
     TIPOS DE CONTRATO POR EMPLEADO
  ========================================================== */

  consultarTiposContratoEmpleados(
    nombre?: string | null
  ): Observable<EmpleadoTipoContratoResponse[]> {

    let params = new HttpParams();

    const filtro =
      nombre?.trim();

    if (filtro) {
      params = params.set(
        'nombre',
        filtro
      );
    }

    return this.http.get<
      EmpleadoTipoContratoResponse[]
    >(
      `${this.baseUrl}/tipos-contrato-empleados`,
      {
        params
      }
    );
  }
  consultarEmpleadosDiscapacidad(
    activos: boolean,
    exEmpleados: boolean
  ): Observable<EmpleadoDiscapacidadResponse[]> {

    const params = new HttpParams()
      .set('activos', activos.toString())
      .set('exEmpleados', exEmpleados.toString());

    return this.http.get<EmpleadoDiscapacidadResponse[]>(
      `${this.baseUrl}/empleados-discapacidad`,
      { params }
    );
  }


  generarEmpleadosDiscapacidadPdf(
    activos: boolean,
    exEmpleados: boolean
  ): Observable<Blob> {

    const params = new HttpParams()
      .set('activos', activos.toString())
      .set('exEmpleados', exEmpleados.toString());

    return this.http.get(
      `${this.baseUrl}/empleados-discapacidad/pdf`,
      {
        params,
        responseType: 'blob'
      }
    );
  }
  consultarFichaActualizacionEmpleado(
  general: boolean,
  idEmpleado: number | null
): Observable<FichaActualizacionEmpleadoResponse[]> {

  let params =
    new HttpParams()
      .set(
        'general',
        general.toString()
      );


  if (
    !general &&
    idEmpleado !== null
  ) {

    params =
      params.set(
        'idEmpleado',
        idEmpleado.toString()
      );

  }


  return this.http.get<
    FichaActualizacionEmpleadoResponse[]
  >(
    `${this.baseUrl}/ficha-actualizacion-empleado`,
    {
      params
    }
  );
}
generarFichaActualizacionEmpleadoPdf(
  general: boolean,
  idEmpleado: number | null
): Observable<Blob> {

  let params =
    new HttpParams()
      .set(
        'general',
        general.toString()
      );


  if (
    !general &&
    idEmpleado !== null
  ) {

    params =
      params.set(
        'idEmpleado',
        idEmpleado.toString()
      );

  }


  return this.http.get(
    `${this.baseUrl}/ficha-actualizacion-empleado/pdf`,
    {
      params,
      responseType: 'blob'
    }
  );
}
}