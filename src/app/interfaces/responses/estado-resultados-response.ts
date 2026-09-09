export interface EstadoResultadosResponse {
  cuenta: string;
  nombreCuenta: string;
  nivel: number;
  saldoMensual: string | null;
  saldoAcumulado: string | null;
  orden: number;
  esTotalGeneral?: boolean;
  esUtilidad?: boolean;
}