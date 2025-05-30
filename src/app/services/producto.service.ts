import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { stream } from 'exceljs';
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
  marca:string;
  contenido:string;
  unidad:string;
  pais:string;
  p:string;
  codbar:string;
}
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number | null;
}


@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private apiBaseUrl = environment.invoicesUrl;

  constructor(private http: HttpClient) {}

  getProductosPorCliente(codigoCliente: number): Observable<Producto[]> {
    return this.http
      .get<ApiResponse<Producto[]>>(`${this.apiBaseUrl}/Producto/producto-clientecodigo/${codigoCliente}`)
      .pipe(
        map(response => response.data ?? []) // puedes transformar más si deseas
      );
  }
crearProducto(request: ProductoRequest): Observable<any> {
  return this.http.post<any>(`${this.apiBaseUrl}/Producto`, request);
}


}