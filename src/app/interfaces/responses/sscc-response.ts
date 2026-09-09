export interface SsccResponse {
  id_sscc: number;
  id_prefijo: number;
  id_cliente: number;
  indicador: number;
  serial: string;
  digito_control: string;
  sscc_completo: string;
  serie?: boolean;
  secuencia_inicio?: number;
  secuencia_fin?: number;
  total_generado?: number;
  producto_codificado?: string;
  estado?: boolean;
  usuario?: string;
  fecha_creacion?: string;
}
