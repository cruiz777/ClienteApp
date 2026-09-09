export interface SsccRequest {
  id?: number;
  id_prefijo: number;
  id_cliente: number;
  indicador: number;
  serial?: string;
  producto_codificado?: string;
  serie?: boolean;
  cantidad_codigos?: number;
  secuencia_inicio?: number;
  secuencia_fin?: number;
  usuario?: string;
}
