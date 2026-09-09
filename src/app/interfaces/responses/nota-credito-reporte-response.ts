export interface NotaCreditoReporteResponse {
  fecha: string;              // ISO date
  cliente: string;
  numeroFactura: string;
  numeroNotaCredito: string;
  subtotal: number;
  base0: number;
  baseIva: number;
  iva: number;
  total: number;
  asientoContable: string | null;
}
