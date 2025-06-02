import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './producto.service'; // si ya tienes esta interfaz
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

@Injectable({
  providedIn: 'root'
})
export class ProductoAdicionalService {

  private apiBaseUrl = environment.invoicesUrl;

  constructor(private http: HttpClient) {}

  crearProductoDatosAdicionales(request: ProductoDatosAdicionalesRequest): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.apiBaseUrl}/ProductoDatosAdicionales`,
      request
    );
  }
}
