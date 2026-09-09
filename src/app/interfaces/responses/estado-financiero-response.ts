export interface EstadoFinancieroResponse {
  cuenta: string;
  nombreCuenta: string;
  nivel: number;
  sum1: string | null;  // de number a string
  sum2: string | null;
  sum3: string | null;
  sum4: string | null;
  sum5: string | null;
  orden: number;
  esTotalGeneral?: boolean;
  esUtilidad?: boolean; 
}