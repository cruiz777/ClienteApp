import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { stream } from 'exceljs';
import { ProductoRequests } from '../interfaces/requests/producto-filter-request'
import { ProductoResponse } from '../interfaces/responses/producto-filter-response'
import { ClienteConProductosResponse } from '../interfaces/responses/producto-filter-response'

export interface PagedResult<T> {
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  records: T[];
}

export interface ProductoRequest {
  IdProducto: number;
  Codpro: string;
  Despro: string;
  Tippro: string;
  Codgru: number;
  Codsec: number;
  Coddep: number;
  Codsub: number;
  Coddiv: number;
  Codmar: number;
  Despro2: string;
  Uniman: string;
  Feccre: string;
  Colsab: string;
  Talla: string;
  Preven: number;
  Preven2: number;
  Precos: number;
  Cospro: number;
  Exiqty: number;
  Exipdc: number;
  Exipdv: number;
  Exisic: number;
  Fecsic: string;
  Refer: string;
  Codcuedeb: string;
  Codcuehab: string;
  Codcuedes: string;
  Codcuedev: string;
  Iva: string;
  Tipo: string;
  Preuni: string;
  Regalia: string;
  Inv: boolean;
  PrevenSinIva: number;
  PagaIva: boolean;
  PagaRegalia: boolean;
  Desind: string;
  Codorigen: string;
  Codcol: number;
  StockMax: number;
  StockMin: number;
  Espesor: number;
  Largo: number;
  Ancho: number;
  Fechacad: string;
  Fechacad1: number;
  Fabricante: number;
  Obs: string;
  Peso: boolean;
  Fecing: string;
  ValorUnidad: number;
  Codsab: string;
  Fechamod: string;
  Tamanio: string;
  Modelo: string;
  Numserie: string;
  Coleccion: string;
  Temporada: string;
  Prepormayor: number;
  PreAnterior: number;
  CosAnterior: number;
  DescCosto1: number;
  DescCosto2: number;
  DescCosto3: number;
  DescCosto4: number;
  Descuento: number;
  PreRebaja: number;
  PreRebajaAntes: number;
  FecIniPro: string;
  FecFinPro: string;
  FecIniPro1: string;
  Codubi: string;
  FecFinPro1: string;
  FecPreAct: string;
  FecPreMod: string;
  FecCosAct: string;
  FecCosMod: string;
  CodNiv: string;
  CodColUbi: string;
  MargenUtilidad: number;
  PvpSinIva: number;
  PorcenRecepcion: number;
  Stocks: boolean;
  Abrevia: string;
  Referencia: string;
  MargenAntes: number;
  FecMarAntes: string;
  CantDecimal: boolean;
  CostSuminis: number;
  CantConv: number;
  CostHelado: number;
  Receta: boolean;
  Activo: boolean;
  ClasProd: string;
  Foto: string;
  AltoRiesgo: boolean;
  PGasto: boolean;
  CtaProdGasto: string;
  RegSanitario: string;
  IdEmpresa: number;
  Codbar: string;
}


export interface Producto {
  IdProducto: number;
  Codpro: string;
  Despro: string;
  Tippro: string;
  Codgru: number;
  Codsec: number;
  Coddep: number;
  Codsub: number;
  Coddiv: number;
  Codmar: number;
  Despro2: string;
  Uniman: string;
  Feccre: string;
  Colsab: string;
  Talla: string;
  Preven: number;
  Preven2: number;
  Precos: number;
  Cospro: number;
  Exiqty: number;
  Exipdc: number;
  Exipdv: number;
  Exisic: number;
  Fecsic: string;
  Refer: string;
  Codcuedeb: string;
  Codcuehab: string;
  Codcuedes: string;
  Codcuedev: string;
  Iva: string;
  Tipo: string;
  Preuni: string;
  Regalia: string;
  Inv: boolean;
  PrevenSinIva: number | null;
  PagaIva: boolean | null;
  PagaRegalia: boolean | null;
  Desind: string;
  Codorigen: string;
  Codcol: number;
  StockMax: number | null;
  StockMin: number | null;
  Espesor: number;
  Largo: number;
  Ancho: number;
  Fechacad: string | null;
  Fechacad1: number;
  Fabricante: number;
  Obs: string;
  Peso: boolean;
  Fecing: string;
  ValorUnidad: number | null;
  Codsab: string;
  Fechamod: string;
  Tamanio: string;
  Modelo: string;
  Numserie: string;
  Coleccion: string;
  Temporada: string;
  Prepormayor: number;
  PreAnterior: number | null;
  CosAnterior: number | null;
  DescCosto1: number | null;
  DescCosto2: number | null;
  DescCosto3: number | null;
  DescCosto4: number | null;
  Descuento: number;
  PreRebaja: number | null;
  PreRebajaAntes: number | null;
  FecIniPro: string | null;
  FecFinPro: string | null;
  FecIniPro1: string | null;
  Codubi: string;
  FecFinPro1: string | null;
  FecPreAct: string | null;
  FecPreMod: string | null;
  FecCosAct: string | null;
  FecCosMod: string | null;
  CodNiv: string;
  CodColUbi: string;
  MargenUtilidad: number | null;
  PvpSinIva: number | null;
  PorcenRecepcion: number | null;
  Stocks: boolean;
  Abrevia: string;
  Referencia: string;
  MargenAntes: number | null;
  FecMarAntes: string | null;
  CantDecimal: number | null;
  CostSuminis: number | null;
  CantConv: number | null;
  CostHelado: number | null;
  Receta: boolean;
  Activo: boolean | null;
  ClasProd: string | null;
  Foto: string;
  AltoRiesgo: boolean | null;
  PGasto: boolean;
  CtaProdGasto: string | null;
  RegSanitario: string | null;
  IdEmpresa: number;
  dbrick: string;
  clienteNombres: string;
  clienteCodigo: string;
  codpre: string;
  tgin: string;
  nusuario: string;
  gtin: string;
  brick: string;
  marca: string;
  contenido: string;
  unidad: string;
  pais: string;
  p: string;
  codbar: string;
  idgrupoproducto: string;
  codigoproducto: string;
  sector: string;
  url: string;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  p6: number;
  po: string;

}
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number | null;
}
export interface FiltroProductoClienteRequest {
  clientesCodigo: number;
  codpre: string;
  estado: string;
  codbar?: string;
  feccreDesde: string; // ISO format
  feccreHasta?: string;
  condicionFecha: string; // Ej: "=", "<", "entre", etc.
}

export interface ReferenciaAbreviaUpdateRequest {
  codbar: string;
  referencia: string;
  abrevia: string;
}


@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private apiBaseUrl = environment.invoicesUrl;
  private apiReporte = environment.reportUrl;

  constructor(private http: HttpClient) { }

 getProductosPorCliente(
  codigoCliente: number,
  pageNumber: number = 1,
  pageSize: number = 10,
  prefijo?: string,
  busqueda?: string
): Observable<PagedResult<Producto>> {
  const params: any = {
    pageNumber,
    pageSize
  };

  if (prefijo) {
    params.prefijo = prefijo;
  }

  if (busqueda) {
    params.busqueda = busqueda;
  }

  return this.http
    .get<ApiResponse<PagedResult<Producto>>>(`${this.apiBaseUrl}/Producto/producto-clientecodigo/${codigoCliente}`, { params })
    .pipe(
      map(response => response.data!)
    );
}

  crearProducto(request: ProductoRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.apiBaseUrl}/Producto`,
      request
    );
  }

  verificarCodbar(codbar: string): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(`${this.apiBaseUrl}/Producto/verificar-codbar/${codbar}`);
  }

  eliminarProducto(id: number): Observable<any> {
    return this.http.delete(`${this.apiBaseUrl}/Producto/${id}`);
  }

  buscarPorCodbar(codbar: string): Observable<Producto> {
    return this.http
      .get<ApiResponse<Producto>>(`${this.apiBaseUrl}/Producto/por-codbar/${codbar}`)
      .pipe(
        map(response => response.data)
      );
  }

  actualizarProducto(payload: {
    idProducto: number;
    request: ProductoRequest;
  }): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      `${this.apiBaseUrl}/Producto/${payload.idProducto}`,
      payload.request
    );
  }
  filtrarProductosPorCliente(filtro: FiltroProductoClienteRequest): Observable<Producto[]> {
  return this.http
    .post<ApiResponse<Producto[]>>(`${this.apiBaseUrl}/Producto/filtrar-por-cliente`, filtro)
    .pipe(map(response => response.data ?? []));
}


  getProductosFiltrados(request: ProductoRequests): Observable<ClienteConProductosResponse> {
    return this.http
      .post<ApiResponse<ClienteConProductosResponse>>(`${this.apiReporte}/Producto/filtrar`, request)
      .pipe(map(response => response.data!));
  }


  getProductosPorClienteYCodbar(codigoCliente: number, codbar: string): Observable<Producto[]> {
  return this.http
    .get<ApiResponse<Producto[]>>(
      `${this.apiBaseUrl}/Producto/por-cliente-y-codbar?clienteCodigo=${codigoCliente}&codbar=${codbar}`
    )
    .pipe(
      map(response => response.data ?? [])
    );
}
actualizarReferenciaYAbrevia(request: ReferenciaAbreviaUpdateRequest): Observable<ApiResponse<boolean>> {
  return this.http.put<ApiResponse<boolean>>(
    `${this.apiBaseUrl}/Producto/actualizar-referencia-abrevia`,
    request
  );
}
getProductosConAbreviaT(): Observable<Producto[]> {
  return this.http
    .get<ApiResponse<Producto[]>>(`${this.apiBaseUrl}/Producto/con-abrevia-t`)
    .pipe(
      map(response => response.data ?? [])
    );
}
eliminarProductoPorCodbar(codbar: string): Observable<ApiResponse<boolean>> {
  return this.http.delete<ApiResponse<boolean>>(
    `${this.apiBaseUrl}/Producto/eliminar-por-codbar/${codbar}`
  );
}


}
