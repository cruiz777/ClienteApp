/**
 * Cada fila del reporte - 27 columnas del VB6
 * Datos Factura (1-9) + Retenciones IVA (10-17) + Retenciones Fuente (18-27)
 */
export interface PurchaseReportItemResponse {
  // ── DATOS FACTURA (Columnas 1-9) ──
  ruc: string;
  proveedor: string;
  noComprobante: string;
  autorizacion: string;
  fecha: string;
  codigoTipoComp: string;
  tipoDocumento: string;
  sustentoTrib: string;
  baseNoObjetoIva: number;
  baseCero: number;
  baseIva: number;
  iva: number;
  total: number;

  // ── RETENCIONES DE IVA (Columnas 10-17) ──
  ivaBienes30: number;
  codIvaBienes30: string;
  ivaServ70: number;
  codIvaServ70: string;
  ivaBienes100: number;
  codIvaBienes100: string;
  ivaServ100: number;
  codIvaServ100: string;
  ivaBienes10: number;
  codIvaBienes10: string;
  ivaBienes20: number;
  codIvaBienes20: string;
  ivaServ50: number;
  codIvaServ50: string;
  // ── RETENCIONES FUENTE (Columnas 18-27) ──
  codRetFuente: string;
  baseRetencion: number;
  porcentajeRetFuente: number;
  montoRetencion: number;
  numComprobante: string;
  autorizacionRetencion: string;
  fechaComprobante: string;
  diario: string;
  tipoDiario: string;
  observaciones: string;
}
/**
 * Totales del reporte - equivalente a ImprimeTotales() del VB6
 */
export interface PurchaseReportTotalsResponse {
  totalBaseNoObjetoIva: number;
  totalBaseCero: number;
  totalBaseIva: number;
  totalIva: number;
  totalGeneral: number;
  totalIvaBienes30: number;
  totalIvaServ70: number;
  totalIvaBienes100: number;
  totalIvaServ100: number;
  totalBaseRetencion: number;
  totalMontoRetencion: number;
  totalIvaBienes10: number;
  totalIvaBienes20: number;
  totalIvaServ50: number;
}

/**
 * Respuesta completa del reporte: items + totales + metadata
 */
export interface PurchaseReportResponse {
  items: PurchaseReportItemResponse[];
  totales: PurchaseReportTotalsResponse;
  fechaInicio: string;
  fechaFin: string;
  nombreEmpresa: string;
}