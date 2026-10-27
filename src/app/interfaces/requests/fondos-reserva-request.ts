import { FondosReservaResponse } from "../responses/fondos-reserva-response";

export interface FondosReservaRequest {
  numPatronal: string;
  idTipEmp: number;
  fechaHasta: string; // formato: 'YYYY-MM-DD'
  idTipoNomEsp: number;
}

export interface GrabarFondosReservaRequest {
  numPatronal: string;
  periodo: string;
  idTipoNomEsp: number;
  forzar: boolean;
  empleados: FondosReservaResponse[];
  idUsuario: number;
  fechaHasta: string;      // formato: 'YYYY-MM-DD'
  fechaPeriodo: string;    // formato: 'YYYY-MM-DD'
  idTipEmp: number;
}