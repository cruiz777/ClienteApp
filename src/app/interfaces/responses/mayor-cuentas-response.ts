export interface MayorCuentasResponse {
  tipo: string;
  asiento: number;
  cheque: number;
  fechaTransaccion: string;
  fechaIngreso: string;
  numeroComprobante: string;
  movimiento: string;
  beneficiario: string;
  debe: number;
  haber: number;
  saldo: number;
  saldoAnterior: number;
  concepto: string;
  cuentaHijo: string;
  nombreHijo: string;
}
