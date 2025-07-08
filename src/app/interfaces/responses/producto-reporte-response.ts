import { PaginationResponse } from "./pagination-response";

export interface Codigo14Response {
  gtin_14: string;
  descripcion: string;
  marca: string;
  contenido_neto: string;
  unidad_medida: string;
  fecha: string;
  presentacion?: number;
  unidad?: number;
  largo?: number;
  ancho?: number;
  profundidad?: number;
  peso?: number;
  target: string;
  sector: string;
  referencia: string;
}

export interface ProductoUnidadLogisticaResponse {
  codigo_producto: string;
  descripcion: string;
  marca: string;
  contenido_neto: string;
  unidad_medida: string;
  fecha: string;
  codigos_14: Codigo14Response[];
}

export interface ProductoReporteMetadataResponse {
  emisor: string;
  fecha_emision: string;
  pagina: number;
  cliente_codigo: number;
  empresa_nombre: string;
  ruc: string;
  prefijo: string;
  tipo_reporte: string;
}

export interface ProductoUnidadLogisticaCompleteResponse {
  metadata: ProductoReporteMetadataResponse;
  productos: PaginationResponse<ProductoUnidadLogisticaResponse>;
}

export interface ReporteUnidadLogisticaParams {
  prefijo?: string;
  clienteCodigo?: number;
  codigoProducto?: string;
  fechaDesde?: string; // formato: YYYY-MM-DD
  fechaHasta?: string; // formato: YYYY-MM-DD
  condicionFecha?: 'IGUAL' | 'MENOR_IGUAL' | 'MAYOR_IGUAL' | 'MAYOR' | 'ENTRE';
  estado?: boolean;
  pageNumber?: number;
  pageSize?: number;
}