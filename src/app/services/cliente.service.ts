import { Injectable } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  map
} from 'rxjs/operators';

import {
  Cliente
} from '../interfaces/cliente';

import {
  environment
} from 'src/environments/environment';

import {
  ApiResponse
} from '../interfaces/responses/api-response';

import {
  ClienteSummary
} from '../interfaces/responses/cliente-summary-response';


// ==========================================================
// RESPUESTAS INTERNAS
// ==========================================================

interface ClienteResponse {
  id: string;
  type: string;
  data: Cliente[];
  message: string;
  total: number;
}


interface ClienteDetalleResponse {
  id: string;
  type: string;
  data: ClienteIndividual;
  message: string;
}


// ==========================================================
// DTO CONTABLE
// ==========================================================

interface CodContablePersonaDto {
  id_cod_contable: number;
  id_persona: number;
}


// ==========================================================
// CLIENTE INDIVIDUAL
// ==========================================================

export interface ClienteIndividual {

  clientes_codigo: number;

  nomcli: string;

  dircli: string;

  concli: string;

  email: string;

  telefono: string;

  telefono1: string;

  razonSocial: string;

  fax: string;

  ruc: string;

  fecing: string;

  fecnac: string;

  fecfac1: string;

  fecfac2: string;

  fecfac3: string;

  fecfac4: string;

  fecfac5: string;

  marca1: string;

  marca2: string;

  marca3: string;

  marca4: string;

  marca5: string;

  codcue: string;

  hello: string;

  desde: number;

  fechtre: string;

  web: string;

  saldo: number;

  fecfac: string;

  ciudad: string;

  obs: string;

  delestado: number;

  genero: string;

  infcamahabitacion: string;

  empresaCodigo: number;

  seguimiento: number;

  fechaactinact: string;

  idEstadoEmpresa: number;

  formatodocumento: number;

  imprimeobstramite: number;

  idTipoCliente: number;

  idGrupoProducto: number;

  idPersona: number;

  codigoPostal: string;

  codigoPostal2: string;

  idVendedor: number;

  idCiudad: number;

  idZona: number;

  idGrupoEmpresa: number;

  representante: string;

  zonaReferencia: string;

  estadoNombre: string;

  prefijo: string;

  fecmod: Date;

  usumod: string;

  fechaCeseAct: string;

  motivoCeseAct: string;
}


// ==========================================================
// UPDATE CLIENTE
// ==========================================================

export interface ClienteUpdateRequest {

  nomcli?: string;

  dircli?: string;

  concli?: string;

  email?: string;

  telefono?: string;

  telefono1?: string;

  razonSocial?: string;

  fax?: string;

  web?: string;

  idEstadoEmpresa?: number;

  idTipoCliente?: number;

  idGrupoProducto?: number;

  codigoPostal?: string;

  idCiudad?: number;

  idZona?: number;

  idGrupoEmpresa?: number;

  representante?: string;

  fechaCeseAct?: string;

  motivoCeseAct?: string;
}


// ==========================================================
// FILTRO
// ==========================================================

export interface ClienteFiltro {

  clienteBusqueda?: number;

  nombreBusqueda?: string;

  rucBusqueda?: string;

  prefijoBusqueda?: string;
}


// ==========================================================
// RESÚMENES
// ==========================================================

export interface TipoClienteConteoResponse {

  idTipoCliente:
    number | null;

  descripcion:
    string;

  cantidad:
    number;
}


export interface ResumenTipoClienteTotalResponse {

  totalPorTipo:
    TipoClienteConteoResponse[];

  diagnostico: {
    total: number;
  };
}


export interface ResumenTipoClienteAnioMesResponse {

  anio:
    number;

  mes:
    number;

  acumuladoAnio:
    TipoClienteConteoResponse[];

  acumuladoMes:
    TipoClienteConteoResponse[];
}


// ==========================================================
// DATOS ADICIONALES
// ==========================================================

export interface ActualizarDatosAdicionalesClienteRequest {

  clientesCodigo:
    number;

  checkPrefijo:
    boolean;

  checkGuia:
    boolean;

  checkOtros:
    boolean;

  idUsuario?:
    number | null;
}


// ==========================================================
// REQUEST AUDITORÍA
// ==========================================================

export interface AuditoriaDatosAdicionalesClienteRequest {

  clientesCodigo:
    number;

  // IMPORTANTE:
  // ESTE CAMPO FALTABA
  nombreCliente:
    string;

  campo:
    string;

  valorAnterior:
    boolean;

  valorNuevo:
    boolean;

  idUsuario?:
    number | null;
}


// ==========================================================
// RESPONSE AUDITORÍA
// ==========================================================

export interface AuditoriaDatosAdicionalesClienteResponse {

  idAuditoria:
    number;

  clientesCodigo:
    number;

  nombreCliente?:
    string;

  campo?:
    string;

  valorAnterior:
    boolean;

  valorNuevo:
    boolean;

  idUsuario?:
    number | null;

  fecha:
    string;

    usuario?:
    string | null;
}


// ==========================================================
// SERVICE
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class ClienteService {

  // ========================================================
  // URLS
  // ========================================================

  private apiBaseUrl =
    environment.clientsUrl;


  private apiUrl =
    `${this.apiBaseUrl}/Clientes/resumen/`;


  private apiUrlA =
    `${this.apiBaseUrl}/Clientes/`;


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private http:
      HttpClient
  ) {
  }


  // ========================================================
  // GET CLIENTES
  // ========================================================

  getClientes(
    pageNumber: number,
    pageSize: number,
    filtros: {
      busquedaGeneral?: string;
      prefijoBusqueda?: string;
    }
  ): Observable<{
    data: Cliente[];
    count: number;
  }> {

    const params: any = {

      pageNumber,

      pageSize,

      ...filtros
    };


    return this.http.get<{
      data: Cliente[];
      count: number;
    }>(
      this.apiUrl,
      {
        params
      }
    );
  }


  // ========================================================
  // GUARDAR CLIENTE
  // ========================================================

  guardarCliente(
    data: any
  ): Observable<any> {

    return this.http.post(
      `${this.apiBaseUrl}/Clientes`,
      data
    );
  }


  // ========================================================
  // CLIENTE POR RUC
  // ========================================================

  getClientePorRuc(
    ruc: string
  ): Observable<any> {

    const url =
      `${this.apiBaseUrl}/ruc?ruc=${encodeURIComponent(ruc)}`;


    return this.http
      .get<any>(url)
      .pipe(

        map(
          response =>
            response.data?.[0]
        )

      );
  }


  // ========================================================
  // CLIENTE POR ID
  // ========================================================

  getClienteById(
    id: number
  ): Observable<any> {

    const url =
      `${this.apiBaseUrl}/Clientes/${id}`;


    return this.http
      .get<any>(url)
      .pipe(

        map(
          response =>
            response.data
        )

      );
  }


  // ========================================================
  // ACTUALIZAR CLIENTE
  // ========================================================

  actualizarCliente(
    id: number,
    request:
      ClienteUpdateRequest
  ): Observable<any> {

    return this.http.put(
      `${this.apiBaseUrl}/Clientes/${id}`,
      request
    );
  }


  // ========================================================
  // CLIENTES DETALLES
  // ========================================================

  getClientesDetalles():
    Observable<
      ClienteIndividual[]
    > {

    const url =
      `${this.apiBaseUrl}/Clientes`;


    return this.http
      .get<any>(url)
      .pipe(

        map(
          response =>
            response.data as
              ClienteIndividual[]
        )

      );
  }


  // ========================================================
  // CLIENTES SUMMARY
  // ========================================================

  getClientesSummary(
    filtro: string
  ): Observable<
    ApiResponse<
      ClienteSummary[]
    >
  > {

    return this.http.get<
      ApiResponse<
        ClienteSummary[]
      >
    >(
      `${this.apiUrlA}buscar?filtro=${encodeURIComponent(filtro)}`
    );
  }


  // ========================================================
  // BUSCAR POR NOMCLI
  // ========================================================

  buscarPorNomcli(
    nomcli: string
  ): Observable<
    ClienteSummary[]
  > {

    const url =
      `${this.apiBaseUrl}/Clientes/buscar-por-nomcli?nomcli=${encodeURIComponent(nomcli)}`;


    return this.http
      .get<
        ApiResponse<
          ClienteSummary[]
        >
      >(url)
      .pipe(

        map(
          response =>
            response.data
        )

      );
  }


  // ========================================================
  // CLIENTES PAGINADOS
  // ========================================================

  getClientesPaginados(
    pageNumber: number,
    pageSize: number,
    filtros: {
      busquedaGeneral?: string;
      prefijoBusqueda?: string;
    } = {}
  ): Observable<{
    data: Cliente[];
    count: number;
  }> {

    let params =
      new HttpParams()
        .set(
          'pageNumber',
          String(pageNumber)
        )
        .set(
          'pageSize',
          String(pageSize)
        );


    if (
      filtros.busquedaGeneral
        ?.trim()
    ) {

      params =
        params.set(
          'busquedaGeneral',
          filtros
            .busquedaGeneral
            .trim()
        );
    }


    if (
      filtros.prefijoBusqueda
        ?.trim()
    ) {

      params =
        params.set(
          'prefijoBusqueda',
          filtros
            .prefijoBusqueda
            .trim()
        );
    }


    return this.http.get<{
      data: Cliente[];
      count: number;
    }>(
      `${this.apiBaseUrl}/Clientes/resumeng`,
      {
        params
      }
    );
  }


  // ========================================================
  // CÓDIGO CONTABLE POR PERSONA
  // ========================================================

  getIdCodContableByPersona(
    idPersona: number
  ): Observable<number> {

    const url =
      `${this.apiBaseUrl}/CodigosContables/persona/${idPersona}`;


    return this.http
      .get<
        ApiResponse<any>
      >(url)
      .pipe(

        map(
          resp => {

            if (
              !resp.data
            ) {

              throw new Error(
                'No se encontró código contable para esa persona.'
              );
            }


            return Number(
              resp.data
                .id_cod_contable
            );
          }
        )

      );
  }


  // ========================================================
  // RESUMEN TIPO CLIENTE AÑO/MES
  // ========================================================

  getResumenTipoClienteAnioMes(
    anio: number,
    mes: number
  ): Observable<
    ApiResponse<any>
  > {

    const url =
      `${this.apiBaseUrl}/Clientes/resumen-tipo-cliente/${anio}/${mes}`;


    return this.http.get<
      ApiResponse<any>
    >(url);
  }


  // ========================================================
  // RESUMEN TIPO CLIENTE TOTAL
  // ========================================================

  getResumenTipoClienteTotal():
    Observable<
      ApiResponse<any>
    > {

    const url =
      `${this.apiBaseUrl}/Clientes/resumen-tipo-cliente-total`;


    return this.http.get<
      ApiResponse<any>
    >(url);
  }


  // ========================================================
  // RESUMEN AFILIADAS AÑO/MES
  // ========================================================

  getResumenTipoClienteAnioMesAfiliadas(
    anio: number,
    mes: number
  ): Observable<
    ApiResponse<any>
  > {

    const url =
      `${this.apiBaseUrl}/Clientes/resumen-tipo-cliente-afiliadas/${anio}/${mes}`;


    return this.http.get<
      ApiResponse<any>
    >(url);
  }


  // ========================================================
  // RESUMEN AFILIADAS TOTAL
  // ========================================================

  getResumenTipoClienteTotalAfiliadas():
    Observable<
      ApiResponse<any>
    > {

    const url =
      `${this.apiBaseUrl}/Clientes/resumen-tipo-cliente-total-afiliadas`;


    return this.http.get<
      ApiResponse<any>
    >(url);
  }


  // ========================================================
  // RESUMEN DESAFILIADAS TOTAL
  // ========================================================

  getResumenTipoClienteTotalDesafiliadas():
    Observable<
      ApiResponse<any>
    > {

    return this.http.get<
      ApiResponse<any>
    >(
      `${this.apiBaseUrl}/Clientes/resumen-tipo-cliente-total-desafiliadas`
    );
  }


  // ========================================================
  // RESUMEN DESAFILIADAS AÑO/MES
  // ========================================================

  getResumenTipoClienteAnioMesDesafiliadas(
    anio: number,
    mes: number
  ): Observable<
    ApiResponse<any>
  > {

    return this.http.get<
      ApiResponse<any>
    >(
      `${this.apiBaseUrl}/Clientes/resumen-tipo-cliente-desafiliadas/${anio}/${mes}`
    );
  }


  // ========================================================
  // ACTUALIZAR DATOS ADICIONALES
  // ========================================================

  actualizarDatosAdicionalesCliente(
    request:
      ActualizarDatosAdicionalesClienteRequest
  ): Observable<any> {

    return this.http.put(
      `${this.apiBaseUrl}/Clientes/actualizar-datos-adicionales`,
      request
    );
  }


  // ========================================================
  // REGISTRAR AUDITORÍA DATOS ADICIONALES
  //
  // IMPORTANTE:
  // AHORA EL REQUEST INCLUYE nombreCliente
  // ========================================================

  registrarAuditoriaDatosAdicionalesCliente(
    request:
      AuditoriaDatosAdicionalesClienteRequest
  ): Observable<any> {

    console.log(
      'SERVICE - AUDITORÍA ENVIADA:',
      request
    );


    return this.http.post(
      `${this.apiBaseUrl}/Clientes/auditoria-datos-adicionales`,
      request
    );
  }


  // ========================================================
  // CONSULTAR AUDITORÍA
  // ========================================================

  getAuditoriaDatosAdicionalesCliente():
    Observable<{
      success: boolean;
      count: number;
      data:
        AuditoriaDatosAdicionalesClienteResponse[];
    }> {

    return this.http.get<{
      success: boolean;
      count: number;
      data:
        AuditoriaDatosAdicionalesClienteResponse[];
    }>(
      `${this.apiBaseUrl}/Clientes/auditoria-datos-adicionales`
    );
  }
}