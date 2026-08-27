/**
 * Filtros para consultar documentos con paginación
 */
export interface DocumentosFilter {
  idEmisor?: number;
  tipoDocumento?: TipoDocumento;
  idEstado?: number;
  observacion?: string;
  fechaEmisionDesde?: string; // Formato: YYYY-MM-DD
  fechaEmisionHasta?: string;
  identificacionComprador?: string;
  razonSocialComprador?: string;
  claveAcceso?: string;
  numeroFactura?: string;
  soloAutorizados?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: OrderByField;
  orderDirection?: 'asc' | 'desc';
}
/**
 * Request para anular un documento
 */
export interface AnularDocumentoRequest {
  observacion: string;
}

// ========================================
// ENUMS / TIPOS
// ========================================

/**
 * Tipos de documentos electrónicos
 */
export type TipoDocumento =
  | 'FACTURA'
  | 'NOTA_CREDITO'
  | 'NOTA_DEBITO'
  | 'RETENCION'
  | 'GUIA_REMISION';

/**
 * Tipos de archivos para descarga
 */
export type TipoArchivo = 'PDF' | 'XML';

/**
 * Campos disponibles para ordenamiento
 */
export type OrderByField = 'fecha_emision' | 'total_documento' | 'razon_social';

/**
 * Estados de documentos
 */
export enum EstadoDocumento {
  AUTORIZADO = 1,
  ANULADO = 2,
  DEVUELTO = 3,
  NO_AUTORIZADO = 4,
  // Agregar más según tu sistema
}

// ========================================
// HELPER TYPES
// ========================================

/**
 * Número de documento desglosado
 */
export interface NumeroDocumento {
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  completo: string; // Ej: "001-001-000000123"
}

/**
 * Info para descarga de archivo
 */
export interface DescargaInfo {
  contenido: Blob;
  nombreArchivo: string;
  contentType: string;
}
