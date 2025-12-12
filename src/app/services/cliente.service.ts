import { Injectable } from '@angular/core';
import { HttpClient,HttpParams  } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Cliente } from '../interfaces/cliente';
import { environment } from 'src/environments/environment';
import { stream } from 'exceljs';
import { ApiResponse } from '../interfaces/responses/api-response';
import { ClienteValidadoDTO, ClienteValidadoResultadoDTO } from '../interfaces/requests/cliente-validado';
import { ClienteSummary } from '../interfaces/responses/cliente-summary-response';

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
interface CodContablePersonaDto {
  id_cod_contable: number;
  id_persona: number;
}
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
export interface ClienteFiltro {
  clienteBusqueda?:number;
  nombreBusqueda?: string;
  rucBusqueda?: string;
  prefijoBusqueda?: string;
}


@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiBaseUrl = environment.clientsUrl;
  //private apiValid = environment.validationUrl; 
  private apiUrl = `${this.apiBaseUrl}/Clientes/resumen/`;
  private apiUrlA = `${this.apiBaseUrl}/Clientes/`;

  constructor(private http: HttpClient) { }

getClientes(
  pageNumber: number,
  pageSize: number,
  filtros: { busquedaGeneral?: string, prefijoBusqueda?: string }
): Observable<{ data: Cliente[], count: number }> {
  const params: any = {
    pageNumber,
    pageSize,
    ...filtros
  };

  return this.http.get<{ data: Cliente[], count: number }>(`${this.apiUrl}`, { params });
}


  guardarCliente(data: any): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/Clientes`, data);

  }
  getClientePorRuc(ruc: string): Observable<Cliente> {
    const url = `${this.apiBaseUrl}/ruc?ruc=${ruc}`;
    return this.http.get<ClienteResponse>(url).pipe(
      map(response => response.data[0]) // toma el primero
    );
  }

  getClienteById(id: number): Observable<ClienteIndividual> {
    const url = `${this.apiBaseUrl}/Clientes/${id}`;
    return this.http.get<ClienteDetalleResponse>(url).pipe(
      map(response => response.data)
    );
  }

  actualizarCliente(id: number, request: ClienteUpdateRequest): Observable<any> {
    return this.http.put(`${this.apiBaseUrl}/Clientes/${id}`, request);
  }

  // Método adicional para obtener todos los clientes con datos completos
  getClientesDetalles(): Observable<ClienteIndividual[]> {
    const url = `${this.apiBaseUrl}/Clientes`;
    return this.http.get<ClienteResponse>(url).pipe(
      map(response => response.data as ClienteIndividual[])
    );
  }

  getClientesSummary(filtro: string): Observable<ApiResponse<ClienteSummary[]>> {
    return this.http.get<ApiResponse<ClienteSummary[]>>(
      `${this.apiUrlA}buscar?filtro=${encodeURIComponent(filtro)}`
    );
  }
  buscarPorNomcli(nomcli: string): Observable<ClienteSummary[]> {
    const url = `${this.apiBaseUrl}/Clientes/buscar-por-nomcli?nomcli=${encodeURIComponent(nomcli)}`;
    return this.http.get<ApiResponse<ClienteSummary[]>>(url).pipe(
      map(response => response.data)
    );
  }

getClientesPaginados(
  pageNumber: number,
  pageSize: number,
  filtros: { busquedaGeneral?: string; prefijoBusqueda?: string } = {}
): Observable<{ data: Cliente[]; count: number }> {
  let params = new HttpParams()
    .set('pageNumber', String(pageNumber))
    .set('pageSize', String(pageSize));

  if (filtros.busquedaGeneral?.trim()) params = params.set('busquedaGeneral', filtros.busquedaGeneral.trim());
  if (filtros.prefijoBusqueda?.trim()) params = params.set('prefijoBusqueda', filtros.prefijoBusqueda.trim());

  return this.http.get<{ data: Cliente[]; count: number }>(
    `${environment.clientsUrl}/Clientes/resumeng`, // <-- ruta correcta
    { params }
  );
}
getIdCodContableByPersona(idPersona: number): Observable<number> {
  const url = `${this.apiBaseUrl}/CodigosContables/persona/${idPersona}`;
  return this.http
    .get<ApiResponse<CodContablePersonaDto>>(url)
    .pipe(
      map(resp => {
        if (!resp.data) {
          throw new Error('No se encontró código contable para esa persona.');
        }
        return resp.data.id_cod_contable;
      })
    );
}

}
