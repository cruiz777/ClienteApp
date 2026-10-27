import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  id?: string;
  type: string;
  message: string;
  data: T;
}

export interface ExploradorCatalogoItem {
  id: number;
  codigo: string;
  descripcion: string;
  tipo: string;
}

export interface ExploradorPeriodo {
  fecha: string;
  anio: number;
  mes: number;
  descripcion: string;
}

export interface ExploradorNominaCatalogosResponse {
  locales: ExploradorCatalogoItem[];
  rubrosIngresos: ExploradorCatalogoItem[];
  rubrosDescuentos: ExploradorCatalogoItem[];
  periodos: ExploradorPeriodo[];
  tiposEmpleado: ExploradorCatalogoItem[];
}

/**
 * Son las tres dimensiones configurables de VB6.
 * Cada una debe existir una sola vez entre Filas, Columnas y Opciones.
 */
export type DimensionExplorador =
  | 'RUBRO'
  | 'PERIODO'
  | 'LOCAL';

export type DimensionFila =
  | 'EMPLEADO'
  | DimensionExplorador;

export type DimensionColumna =
  DimensionExplorador;

export type OpcionExplorador =
  DimensionExplorador;

export type EstadoEmpleadoExplorador =
  | 'TODOS'
  | 'ACTIVOS'
  | 'EXEMPLEADOS';

export interface ExploradorNominaRequest {
  fechaInicio: string;
  fechaFin: string;
  periodos: string[];

  idEmpleados: number[];
  idRubros: number[];
  idLocales: number[];
  idTiposEmpleado: number[];

  filas: DimensionFila[];
  columnas: DimensionColumna[];
  opciones: OpcionExplorador[];

  estadoEmpleado: EstadoEmpleadoExplorador;

  descuentosNegativos: boolean;
  soloConValores: boolean;
  incluirCantidades: boolean;
  totalizarFilas: boolean;
  totalizarColumnas: boolean;
}

export interface ExploradorNominaColumna {
  field: string;
  headerName: string;
  tipo: 'text' | 'number' | 'date';
  fija: boolean;
  orden: number;
  idRubro?: number | null;
  periodo?: string | null;
  tipoPago?: string | null;
}

export interface ExploradorNominaResponse {
  columnas: ExploradorNominaColumna[];
  filas: Record<string, unknown>[];
  totales: Record<string, number>;
  totalRegistros: number;
}

@Injectable({
  providedIn: 'root',
})
export class ExploradorNominaService {
  private readonly baseUrl =
    `${environment.nominaUrl}/RolNomina`;

  constructor(
    private readonly http: HttpClient
  ) {}

  obtenerCatalogos(): Observable<
    ApiResponse<ExploradorNominaCatalogosResponse>
  > {
    return this.http.get<
      ApiResponse<ExploradorNominaCatalogosResponse>
    >(`${this.baseUrl}/explorador/catalogos`);
  }

  generarExplorador(
    request: ExploradorNominaRequest
  ): Observable<ApiResponse<ExploradorNominaResponse>> {
    return this.http.post<
      ApiResponse<ExploradorNominaResponse>
    >(
      `${this.baseUrl}/explorador`,
      request
    );
  }
}