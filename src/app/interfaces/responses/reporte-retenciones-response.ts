export interface RetencionReporteResponse {
  codigoRetencion: string;
  descripcionRetencion: string;
  numeroFactura: string;
  fecha: Date | string;
  contribuyente: string;
  rucCi: string;
  baseImponible: number;
  valorRetenido: number;
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