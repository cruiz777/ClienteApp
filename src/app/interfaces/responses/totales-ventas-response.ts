import { FacturaReporteResponse } from "./factura-reporte-response";
import { NotaCreditoReporteResponse } from "./nota-credito-reporte-response";
import { PaginationResponse } from "./pagination-response";

export interface TotalesReporteVentas {
  subtotal: number;
  descuento: number;
  base0: number;
  baseIva: number;
  iva: number;
  total: number;
}
export interface ReporteFacturasResponse {
  paginacion: PaginationResponse<FacturaReporteResponse>;
  totales: TotalesReporteVentas;
}

export interface ReporteNotasCreditoResponse {
  paginacion: PaginationResponse<NotaCreditoReporteResponse>;
  totales: TotalesReporteVentas;
}
