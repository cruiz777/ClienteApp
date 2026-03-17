export interface MayorCodigosAgrupadoResponse {
  codigosContables: CodigoContableResponse[];
  totalesGenerales: TotalesResponse;
  filtros: FiltrosReporteResponse;
}

export interface CodigoContableResponse {
  idCodContable: number;
  nombreCodigo: string;
  cuentas: CuentaHijaResponse[];
  totalesCodigo: TotalesResponse;
}

export interface CuentaHijaResponse {
  cuentaHijo: string;
  saldoAnterior: number;
  movimientos: MovimientoDetalleResponse[];
  totalesCuenta: TotalesResponse;
}

export interface MovimientoDetalleResponse {
  tipo: string | null;
  asiento: number | null;
  cheque: number | null;
  fechaTransaccion: string | null;
  numeroComprobante: string | null;
  beneficiario: string | null;
  concepto: string | null;
  debe: number;
  haber: number;
  saldo: number;
}

export interface TotalesResponse {
  debe: number;
  haber: number;
  saldo: number;
}

export interface FiltrosReporteResponse {
  fechaDesde: string;
  fechaHasta: string;
  zona?: string;
  local?: string;
}