export interface DecimosEmpleadoResponse {
  idEmpleado: number;
  idLocal: number | null;
  local: string;
  numeroAfiliado: string;
  cedula: string;
  codigoSectorial: string | null;
  nombreEmpleado: string;
  dias: number;
  valorDecimo: number;
  fechaIngreso: string | null;
  fechaSalida: string | null;
  observaciones: string | null;
  descuento: number;
  pagoNomina: number;
  retJudicial: number;
  liquidoARecibir: number;
}