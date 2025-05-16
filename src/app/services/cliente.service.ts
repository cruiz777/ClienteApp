import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Cliente } from '../interfaces/cliente';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/responses/api-response';
import { ClienteValidadoDTO, ClienteValidadoResultadoDTO } from '../interfaces/requests/cliente-validado';

interface ClienteResponse {
  id: string;
  type: string;
  data: Cliente[];
  message: string;
}
interface ClienteDetalleResponse {
  id: string;
  type: string;
  data: ClienteIndividual;
  message: string;
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

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiBaseUrl = environment.clientsUrl;
  private apiUrl = `${this.apiBaseUrl}/resumen/`;

  constructor(private http: HttpClient) {}

  getClientes(): Observable<Cliente[]> {
    debugger
    return this.http.get<ClienteResponse>(this.apiUrl).pipe(
      map(response => response.data)
    );
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

  // ✅ Validación Masiva
  validarMasivo(clienteIds: number[]): Observable<ApiResponse<ClienteValidadoResultadoDTO[]>> {
    return this.http.post<ApiResponse<ClienteValidadoResultadoDTO[]>>(`${this.apiBaseUrl}/Clientes/validar-masivo`, clienteIds);
  }

  // ✅ Validación Unitaria
  validarUno(clienteId: number): Observable<ApiResponse<ClienteValidadoDTO>> {
    return this.http.post<ApiResponse<ClienteValidadoDTO>>(
      `${this.apiBaseUrl}/Clientes/validar`,
      clienteId, // ✅ pasar el número directamente
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }


  // Método adicional para obtener todos los clientes con datos completos
  getClientesDetalles(): Observable<ClienteIndividual[]> {
    const url = `${this.apiBaseUrl}/Clientes`;
    return this.http.get<ClienteResponse>(url).pipe(
      map(response => response.data as ClienteIndividual[])
    );
  }
}
