export interface GenerateSsccRequest {
  id_prefijo: number;
  id_cliente: number;
  indicador: number;
  producto_codificado?: string;
  serie: boolean;
  secuencia_inicio?: number;
  cantidad_codigos: number;
  usuario: string;
}
