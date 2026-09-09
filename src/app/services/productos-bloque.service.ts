import { Injectable } from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from 'src/environments/environment';


// ==========================================================
// REQUEST CONSULTAR
// ==========================================================

export interface ConsultarProductosBloqueRequest {
  codigos: string[];
}


// ==========================================================
// PRODUCTO PREVIEW
// ==========================================================

export interface ProductoBloquePreviewResponse {

  idProducto?: number | null;

  codbar: string;

  descripcion?: string | null;

  existeProducto: boolean;

  existeDatosAdicionales: boolean;

  existeCodigo14: boolean;

  estado: string;
}


// ==========================================================
// RESPONSE CONSULTAR
// ==========================================================

export interface ConsultarProductosBloqueResponse {

  success: boolean;

  total: number;

  encontrados: number;

  noEncontrados: number;

  data: ProductoBloquePreviewResponse[];
}


// ==========================================================
// REQUEST ELIMINAR
// ==========================================================

export interface EliminarProductosBloqueRequest {

  codigos: string[];

  idUsuario?: number | null;
}


// ==========================================================
// PRODUCTO ELIMINADO
// ==========================================================

export interface ProductoEliminadoBloqueResponse {

  idProducto: number;

  codbar: string;

  descripcion?: string | null;
}


// ==========================================================
// RESULTADO ELIMINACIÓN
// ==========================================================

export interface EliminarProductosBloqueData {

  totalSolicitados: number;

  totalEliminados: number;

  totalNoEncontrados: number;

  eliminados:
    ProductoEliminadoBloqueResponse[];

  noEncontrados:
    string[];
}


// ==========================================================
// RESPONSE ELIMINAR
// ==========================================================

export interface EliminarProductosBloqueResponse {

  success: boolean;

  message: string;

  data:
    EliminarProductosBloqueData;
}


// ==========================================================
// SERVICE
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class ProductosBloqueService {

  /*
   * IMPORTANTE:
   *
   * Si environment.validationUrl ya contiene:
   *
   * http://localhost:5004/validations/api
   *
   * esta URL quedará:
   *
   * http://localhost:5004/validations/api/ProductosLicenses
   */

  private readonly apiUrl =
    `${environment.validationUrl}/ProductosLicenses`;


  constructor(
    private http:
      HttpClient
  ) {
  }


  // ========================================================
  // CONSULTAR PRODUCTOS
  // ========================================================

  consultarProductosBloque(
    codigos: string[]
  ): Observable<
    ConsultarProductosBloqueResponse
  > {

    const request:
      ConsultarProductosBloqueRequest = {

      codigos:
        codigos
    };


    return this.http.post<
      ConsultarProductosBloqueResponse
    >(
      `${this.apiUrl}/productos/consultar-bloque`,
      request
    );
  }


  // ========================================================
  // ELIMINAR PRODUCTOS
  // ========================================================

  eliminarProductosBloque(
    codigos: string[],
    idUsuario?:
      number | null
  ): Observable<
    EliminarProductosBloqueResponse
  > {

    const request:
      EliminarProductosBloqueRequest = {

      codigos:

        codigos,

      idUsuario:

        idUsuario ??
        null
    };


    return this.http.post<
      EliminarProductosBloqueResponse
    >(
      `${this.apiUrl}/productos/eliminar-bloque`,
      request
    );
  }
}