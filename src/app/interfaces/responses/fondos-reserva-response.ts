export interface FondosReservaResponse {
  idEmpleado: number;
  idLocal: number | null;
  local: string | null;
  numeroAfiliado: string | null;
  cedula: string | null;
  codigoSectorial: string | null;
  nombreEmpleado: string;
  dias: number;
  sueldoAcumulado: number;
  valorFR: number;
  fechaIngreso: string | null;  // formato: 'YYYY-MM-DD'
  fechaSalida: string | null;   // formato: 'YYYY-MM-DD'
  descuento: number;
  retJudicial: number;
  liquidoARecibir: number;
  genero: string | null;
  ocupacion: string | null;
  idBancos: number | null;
  pagadoNomina: number;
  observacion: string | null;
}