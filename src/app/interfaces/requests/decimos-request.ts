import { DecimosEmpleadoResponse } from "../responses/decimos-response";

export interface DecimosRequest {
  numPatronal: string;
  idTipEmp: number;
  fechaHasta: string; // 'YYYY-MM-DD'
  idTipoNomEsp: number;
  idRegimen?: number;
}
export interface GrabarDecimosRequest {
  numPatronal: string;
  periodo: string; // año ej: '2026'
  idTipoNomEsp: number;
  forzar: boolean;
  idUsuario: number;
  empleados: DecimosEmpleadoResponse[];
}