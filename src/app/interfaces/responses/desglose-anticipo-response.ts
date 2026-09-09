/**
 * Respuesta completa del desglose de un anticipo
 */
export interface DesgloceAnticipoResponse {
  info_anticipo: InfoAnticipoResponse;
  resumen_uso: ResumenUsoAnticipoResponse;
  detalle_movimientos: UsoAnticipoItemResponse[];
}

/**
 * Información general del anticipo (cabecera del reporte)
 */
export interface InfoAnticipoResponse {
  id_anticipo: number;
  numero_anticipo: string;
  fecha_creacion: string; // ISO date string
  cliente_codigo: number;
  nombre_cliente: string;
  monto_original: number;
  concepto: string;
  esta_liquidado: boolean;
  fecha_liquidacion?: string; // ISO date string
  monto_liquidado?: number;
  forma_pago_liquidacion?: string;
  beneficiario_liquidacion?: string;
}

/**
 * Resumen de uso del anticipo (totales)
 */
export interface ResumenUsoAnticipoResponse {
  monto_original: number;
  total_utilizado: number;
  saldo_disponible: number;
  cantidad_usos: number;
  usos_en_facturas: number;
  usos_en_pagos: number;
}

/**
 * Detalle de cada uso del anticipo
 */
export interface UsoAnticipoItemResponse {
  fecha_uso: string; // ISO date string
  tipo_documento: 'FACTURA' | 'PAGO';
  numero_documento: string;
  monto_utilizado: number;
  observacion?: string;
}
