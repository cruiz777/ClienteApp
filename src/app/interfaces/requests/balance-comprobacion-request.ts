export interface BalanceComprobacionRequest {
  fechaDesde?: string;
  fechaHasta?: string;
  cuentaA?: string;
  cuentaB?: string;
  idLocal?: number | null;
  idZona?: number | null;
}
