export interface BalanceComprobacionResponse {
  cuenta: string;
  saDebe: number;
  saHaber: number;
  saldoAnterior: number;
  debe: number;
  haber: number;
  neto: number;
  cuentaHijo: string;
  nombreHijo: string;
  nivelHijo: string;
  cuentaPadre: string;
  nombrePadre: string;
  nivelPadre: string;
  cuentaRaiz: string;
  nombreRaiz: string;
  nivelRaiz: string;
}
