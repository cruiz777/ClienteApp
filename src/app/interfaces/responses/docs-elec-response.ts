export interface DocumentoEstadoResponse {
  id_estado_documento: number;
  fecha_emision: string; // DateOnly en C# → string ISO en TS
  establecimiento: string;
  punto_emision: string;
  secuencial: string;
  razon_social_comprador: string;
  identificacion_comprador: string;
  total_documento: number;
  estado: string;
  observacion: string;
  fecha_autorizacion: string | null; // DateOnly? → string | null
  clave_acceso: string;
  tipo_documento: string;
  puede_reimprimir: boolean;
}
export interface DocumentoEstadoDetalleResponse {
  id_estado_documento: number;
  id_emisor: number;
  id_estado: number;
  clave_acceso: string;
  emisor: string;
  total_documento: number;
  fecha_registro: string;
  observacion: string;
  razon_social_comprador: string;
  identificacion_comprador: string;
  path_archivo: string;
  fecha_emision: string;
  correo_electronico: string;
  estatus_gap: boolean | null;
  nombre_archivo: string | null;
  tipo_documento: string;
}
/**
 * Response para obtener rutas de archivos XML/PDF
 */
export interface DocumentoArchivoResponse {
  clave_acceso: string;
  path_xml: string;
  path_pdf: string;
  existe_xml: boolean;
  existe_pdf: boolean;
  nombre_archivo: string;
}
