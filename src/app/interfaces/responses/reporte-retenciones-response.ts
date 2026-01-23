// src/app/interfaces/responses/reporte-retenciones-response.ts

export interface RetencionReporteResponse {
  fecha: Date | string;
  contribuyente: string;
  rucCi: string;
  numeroFactura: string;
  numeroRetencion: string;
  tipoComprobante: string;
  baseImponible: number;
  porcentajeRetencion: number;
  valorRetenido: number;
  concepto: string;
  codigoRetencion: string;
}

export interface TotalesReporteRetenciones {
  totalBaseImponible: number;
  totalValorRetenido: number;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message: string;
}

export interface ReporteRetencionesResponse {
  paginacion: PaginationResponse<RetencionReporteResponse>;
  totales: TotalesReporteRetenciones;
}