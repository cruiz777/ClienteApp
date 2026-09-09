import { NotaCreditoReporteResponse } from "./nota-credito-reporte-response";

export interface FacturaReporteResponse {
  fecha: string;              // ISO date
  cliente: string;
  numeroFactura: string;
  subtotal: number;
  descuento: number;
  base0: number;
  baseIva: number;
  iva: number;
  total: number;
  asientoContable: string | null;
}
export interface ReporteVentasCompleto {
  facturas: FacturaReporteResponse[];
  notasCredito: NotaCreditoReporteResponse[];
}
