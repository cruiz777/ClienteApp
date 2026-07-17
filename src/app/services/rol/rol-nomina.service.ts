import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
}
export interface ActualizarValorQuincenaRequest {
  fechaPeriodo: string;
  numeroQuincena: number;
  idEmpleado: number;
  valorQuincena: number;
  idUsuario?: number | null;
}
export interface GenerarRolMensualRequest {
  fechaPeriodo: string;
  idLocal: number | null;
  idDepartamento: number | null;
  verLocales: boolean;
  areas: boolean;
  exEmpleados: boolean;
  idUsuario: number | null;
  sobrescribir: boolean;
}
export interface RecalcularRolMensualRequest {
  fechaPeriodo: string;
  idLocal?: number | null;
  idDepartamento?: number | null;
  idUsuario?: number | null;
}
export interface RolMensualRequest {
  fechaPeriodo: string;
  idLocal: number | null;
  idDepartamento: number | null;
  verLocales: boolean;
  areas: boolean;
  exEmpleados: boolean;
  departamentos: boolean;
  totalizados: boolean;
  porRubros: boolean;
  todosLosRubros: boolean;
  totalizar: boolean;
}
export interface AnularRolQuincenaRequest {
  fechaPeriodo: string; // yyyy-MM-dd
  numeroQuincena: number;
  idLocal?: number | null;
  idDepartamento?: number | null;
  idUsuario?: number | null;
}

export interface RubroColumnaResponse {
  idIngDesc: number;
  codigo: string;
  tipoPago: string;
  descripcion: string;
  columnaKey: string;
}

export interface RolMensualEmpleadoResponse {
  idEmpleado: number;
  codigoEmpleado: string;
  nombreEmpleado: string;

  // SOLO PARA EXPORTAR A EXCEL
  cedula?: string | null;
  cargo?: string | null;

  estado: string;
  idLocal: number | null;
  local: string | null;

  diasTrabajados: number;
  rubros: Record<string, number>;

  totalIngresos: number;
  totalDescuentos: number;
  liquidoRecibir: number;
}

export interface RolMensualTotalesResponse {
  totalRubros: Record<string, number>;
  totalIngresos: number;
  totalDescuentos: number;
  totalLiquidoRecibir: number;
}

export interface RolMensualResponse {
  nodos: any[];
  columnasRubros: RubroColumnaResponse[];
  empleados: RolMensualEmpleadoResponse[];
  totales: RolMensualTotalesResponse;
}

export interface RolIndividualResponse {
  idEmpleado: number;
  codigoEmpleado: string;
  nombreEmpleado: string;
  cedula: string | null;
  email: string | null;

  idLocal: number | null;
  local: string | null;

  tipoEmpleado: string;
  cargo: string | null;
  contrato: string | null;

  sueldo: number;
  valorHoraBase: number;

  fechaPeriodo: string;
  fechaIngreso: string | null;
  fechaSalida: string | null;

  ingresos: RolIndividualRubroResponse[];
  egresos: RolIndividualRubroResponse[];

  totalIngresos: number;
  totalEgresos: number;
  liquidoRecibir: number;

  porcentajeIessPersonal: number;

  porcentajeFondoReserva: number;
  tieneDerechoFondoReserva: boolean;
  fechaDerechoFondoReserva: string | null;

  anticipoQuincenaEmpleado?: number;

}
export interface ActualizarCantidadRubroMensualRequest {
  idEmpleado: number;
  fechaPeriodo: string;
  idIngDesc: number;
  cantidad: number;
  idUsuario: number;
}
export interface EnviarRolesCorreoRequest {
  fechaPeriodo: string;      // yyyy-MM-dd
  idUsuario: number;
  idsEmpleados: number[];
}

export interface EnviarRolesCorreoResponse {
  procesado: boolean;
  totalEmpleados: number;
  totalEnviados: number;
  totalSinCorreo: number;
  mensaje?: string | null;
  enviados?: string[] | null;
  sinCorreo?: string[] | null;
  errores?: string[] | null;
}

export interface RolIndividualRubroResponse {
  idRolNomina: number | null;
  idIngDesc: number;

  tipoPago: string;
  codigo: string;
  descripcion: string;

  cantidad: number;
  valor: number;

  existeEnRol: boolean;

  esHoraExtra: boolean;
  factorHoraExtra: number;

  aportaIess: boolean;
  aplicaImpuestoRenta: boolean;
  aplicaFondoReserva: boolean;
  aplicaDecimoTercero: boolean;
}
export interface GuardarRolIndividualRequest {
  idEmpleado: number;
  fechaPeriodo: string;
  idUsuario: number | null;
  rubros: GuardarRolIndividualRubroRequest[];
}

export interface GuardarRolIndividualRubroRequest {
  idRolNomina: number | null;
  idIngDesc: number;

  tipoPago: string;
  codigo: string;
  descripcion: string;

  cantidad: number;
  valor: number;

  esHoraExtra: boolean;
  factorHoraExtra: number;

  aportaIess: boolean;
  aplicaImpuestoRenta: boolean;
  aplicaFondoReserva: boolean;
  aplicaDecimoTercero: boolean;
}
export interface CalcularImpuestoRentaRequest {
  idEmpleado: number;
  fechaPeriodo: string;
  idLocal?: number | null;
  idUsuario?: number | null;
  respetarValorManual: boolean;
}

export interface CalcularImpuestoRentaResponse {
  idEmpleado: number;
  fechaPeriodo: string;
  valorImpuestoRenta: number;
  rubro: string;
  calculado: boolean;
}

export interface GenerarArchivoBancoNominaRequest {
  fechaPeriodo: string;
  codBanco: number;
  descripcionPago?: string | null;
  idLocal?: number | null;
  idUsuario?: number | null;
}

export interface GenerarArchivoBancoNominaResponse {
  procesado: boolean;
  nombreArchivo: string;
  contenidoBase64: string;
  contentType: string;
  totalEmpleados: number;
  total: number;
  mensaje: string;
}


export interface GenerarArchivoBancoNominaResponse {
  procesado: boolean;
  nombreArchivo: string;
  contenidoBase64: string;
  contentType: string;
  totalEmpleados: number;
  total: number;
  mensaje: string;
}

export interface ImprimirReporteFormaPagoRequest {
  fechaPeriodo: string;
  codBanco: number;
  descripcionPago?: string | null;
  idLocal?: number | null;
  idUsuario?: number | null;
}

export interface GenerarRolQuincenaRequest {
  fechaPeriodo: string;
  numeroQuincena: number;
  idLocal?: number | null;
  idDepartamento?: number | null;
  idUsuario?: number | null;
  sobrescribir: boolean;
}

export interface RolQuincenaRequest {
  fechaPeriodo: string;
  numeroQuincena: number;
  idLocal?: number | null;
  idDepartamento?: number | null;
}

export interface RolQuincenaEmpleadoResponse {
  idEmpleado: number;
  codigoEmpleado: string;
  nombreEmpleado: string;
  cedula?: string | null;
  idLocal?: number | null;
  local?: string | null;
  formaPago?: string | null;
  banco?: string | null;
  cuenta?: string | null;
  valorQuincena: number;
}

export interface RolQuincenaResponse {
  empleados: RolQuincenaEmpleadoResponse[];
  totalEmpleados: number;
  totalValor: number;
}

export interface GenerarArchivoBancoQuincenaRequest {
  fechaPeriodo: string;
  numeroQuincena: number;
  codBanco: number;
  descripcionPago?: string | null;
  idLocal?: number | null;
  idDepartamento?: number | null;
  idUsuario?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class RolNominaService {
  private readonly apiUrl = `${environment.nominaUrl}/RolNomina`;

  constructor(private http: HttpClient) { }

  generarRolMensual(request: GenerarRolMensualRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/generar-mensual`,
      request
    );
  }

  getRolMensual(request: RolMensualRequest): Observable<ApiResponse<RolMensualResponse>> {
    return this.http.post<ApiResponse<RolMensualResponse>>(
      `${this.apiUrl}/mensual`,
      request
    );
  }

  getRolIndividual(
    idEmpleado: number,
    fechaPeriodo: string
  ): Observable<ApiResponse<RolIndividualResponse>> {
    const params = new HttpParams()
      .set('idEmpleado', idEmpleado.toString())
      .set('fechaPeriodo', fechaPeriodo);

    return this.http.get<ApiResponse<RolIndividualResponse>>(
      `${this.apiUrl}/individual`,
      { params }
    );
  }
  guardarRolIndividual(
    request: GuardarRolIndividualRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/individual/sync`,
      request
    );
  }
  descargarRolIndividualPdf(
    idEmpleado: number,
    fechaPeriodo: string
  ): Observable<Blob> {
    const params = new HttpParams()
      .set('idEmpleado', idEmpleado.toString())
      .set('fechaPeriodo', fechaPeriodo);

    return this.http.get(
      `${this.apiUrl}/individual/impresion`,
      {
        params,
        responseType: 'blob'
      }
    );
  }

  calcularImpuestoRenta(request: CalcularImpuestoRentaRequest): Observable<ApiResponse<CalcularImpuestoRentaResponse>> {
    return this.http.post<ApiResponse<CalcularImpuestoRentaResponse>>(
      `${this.apiUrl}/RolNomina/calcular-impuesto-renta`,
      request
    );
  }
  recalcularRolMensual(request: RecalcularRolMensualRequest) {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/recalcular-mensual`,
      request
    );
  }
  enviarRolesPorCorreo(
    request: EnviarRolesCorreoRequest
  ): Observable<ApiResponse<EnviarRolesCorreoResponse>> {
    return this.http.post<ApiResponse<EnviarRolesCorreoResponse>>(
      `${this.apiUrl}/enviar-roles-correo`,
      request
    );
  }

  actualizarCantidadRubroMensual(request: ActualizarCantidadRubroMensualRequest) {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/actualizar-cantidad-rubro-mensual`,
      request
    );
  }
  generarArchivoBanco(
    request: GenerarArchivoBancoNominaRequest
  ): Observable<ApiResponse<GenerarArchivoBancoNominaResponse>> {
    return this.http.post<ApiResponse<GenerarArchivoBancoNominaResponse>>(
      `${this.apiUrl}/generar-archivo-banco`,
      request
    );
  }

  imprimirReporteFormaPago(
    request: ImprimirReporteFormaPagoRequest
  ): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/reporte-forma-pago/pdf`,
      request,
      {
        responseType: 'blob'
      }
    );
  }

  generarRolQuincena(
    request: GenerarRolQuincenaRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/generar-quincena`,
      request
    );
  }

  getRolQuincena(
    request: RolQuincenaRequest
  ): Observable<ApiResponse<RolQuincenaResponse>> {
    return this.http.post<ApiResponse<RolQuincenaResponse>>(
      `${this.apiUrl}/quincena`,
      request
    );
  }

  generarArchivoBancoQuincena(
    request: GenerarArchivoBancoQuincenaRequest
  ): Observable<ApiResponse<GenerarArchivoBancoNominaResponse>> {
    return this.http.post<ApiResponse<GenerarArchivoBancoNominaResponse>>(
      `${this.apiUrl}/generar-archivo-banco-quincena`,
      request
    );
  }

  imprimirReporteFormaPagoQuincena(
    request: GenerarArchivoBancoQuincenaRequest
  ): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/reporte-quincena-forma-pago/pdf`,
      request,
      {
        responseType: 'blob'
      }
    );
  }
  actualizarValorQuincena(
    request: ActualizarValorQuincenaRequest
  ): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/quincena/actualizar-valor`,
      request
    );
  }
  anularRolQuincena(
  request: AnularRolQuincenaRequest
): Observable<ApiResponse<boolean>> {
  return this.http.post<ApiResponse<boolean>>(
    `${this.apiUrl}/anular-quincena`,
    request
  );
}
}