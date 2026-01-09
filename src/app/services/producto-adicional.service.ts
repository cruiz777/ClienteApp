import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface GtinResumenResponse {
  gtinTipo: string;
  cantidad: number;
  anio: number;
}
export interface ApiResponse<T> {
  id: string;
  code: string;
  data: T;
  message: string;
}

export interface UpdateCodigosClienteRequest {
  idPrefijos: number;
  codigosCliente: number;
}

export interface ProductoDatosAdicionalesRequest {
  IdProductoDatosAdicionales: number;
  ClientesCodigo: number;
  IdPrefijos: number;
  IdTipoCodigoGs1: number;
  IdGrupoProducto: number;
  Peso1: number;
  IdUsuario: number;
  Facturar: string;
  Nombre: string;
  Gtin: string;
  Target: string;
  Marca: string;
  Autfuncion: string;
  Registros: string;
  Obsc: string;
  IdSector: number;
  Contenido: string;
  Um: string;
  Brick: string;
  Pais: string;
  Url: string;
  Pum: string;
  Lum: string;
  Aum: string;
  Url2: string;
  Pais2: string;
  Pais3: string;
  Codint: string;
  Secto2: string;
  Sector3: string;
  SolFavorita: number;
  SolRosado: number;
  SolSantamaria: number;
  SolTia: number;
  SolAmazon: number;
  SolGoogle: number;
  SolEbay: number;
  SolOtros: string;
  id_producto: number;
}
export interface UpdateCodigosClientePorFiltrosRequest {
  codbar: string;
  clientesCodigoAnterior: number;
  clientesCodigoNuevo: number;
  idPrefijosNuevo: number;
}
export interface GtinResumenResponseM {
  gtinTipo: string;
  cantidad: number;
  anio: number;
  mes: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoAdicionalService {
  private apiBaseUrl = environment.invoicesUrl;

  constructor(private http: HttpClient) { }

  crearProductoDatosAdicionales(request: ProductoDatosAdicionalesRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.apiBaseUrl}/ProductoDatosAdicionales`,
      request
    );
  }

  actualizarProductoDatosAdicionales(payload: {
    idProducto: number,
    request: ProductoDatosAdicionalesRequest
  }): Observable<any> {
    const url = `${this.apiBaseUrl}/ProductoDatosAdicionales/por-producto/${payload.idProducto}`;
    return this.http.put(url, payload.request);
  }

  obtenerProductoDatosAdicionalesPorIdPrefijos(idPrefijos: number): Observable<ApiResponse<ProductoDatosAdicionalesRequest>> {
    const url = `${this.apiBaseUrl}/ProductoDatosAdicionales/por-idprefijos/${idPrefijos}`;
    return this.http.get<ApiResponse<ProductoDatosAdicionalesRequest>>(url);
  }

  actualizarCodigosClientePorIdPrefijos(idPrefijos: number, codigosCliente: number): Observable<ApiResponse<boolean>> {
    const payload = {
      idPrefijos,
      codigosCliente
    };

    return this.http.put<ApiResponse<boolean>>(
      `${this.apiBaseUrl}/ProductoDatosAdicionales/actualizar-codigoscliente-por-idprefijos`,
      payload
    );
  }
  actualizarCodigosClientePorFiltros(request: {
    codbar: string;
    clientesCodigoAnterior: number;
    clientesCodigoNuevo: number;
    idPrefijosNuevo: number;
  }): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiBaseUrl}/ProductoDatosAdicionales/actualizar-codigoscliente-por-filtros`,
      request
    );
  }
getResumenPorAnio(anio: number): Observable<ApiResponse<GtinResumenResponse[]>> {
    const url = `${this.apiBaseUrl}/ProductoDatosAdicionales/resumen-gtin-por-anio/${anio}`;
    return this.http.get<ApiResponse<GtinResumenResponse[]>>(url);
  }
  getResumenPorMes(anio: number, mes: number): Observable<ApiResponse<GtinResumenResponseM[]>> {
  const url = `${this.apiBaseUrl}/ProductoDatosAdicionales/resumen-gtin-por-mes/${anio}/${mes}`;
  return this.http.get<ApiResponse<GtinResumenResponseM[]>>(url);
}


}
