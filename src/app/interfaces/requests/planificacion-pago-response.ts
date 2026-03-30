export interface DocumentoPagoRequest {
  id_cuenta_por_pagar: number;
  tipo_pago: string;  // 'P' | 'A' | 'N'
  valor_pago: number;
  comentario?: string;
}

export interface ProcesarPagoRequest {
  id_empresa: number;
  id_usuario: number;
  fecha_pago: string;  // 'YYYY-MM-DD'
  fecha_vencimiento?: string;  // 'YYYY-MM-DD'
  id_forma_pago: number;
  cuenta_banco: string;
  observacion?: string;
  beneficiario?: string;
  numero_cheque?: string;
  numero_transaccion_banco?: string;
  documentos: DocumentoPagoRequest[];
  id_zona: number;
  id_tipo_asiento: number;
}
export interface AprobarPlanificacionRequest {
  numero_transaccion: number;
  id_empresa: number;
  id_usuario: number;
  id_zona: number;
  id_tipo_asiento: number;
  documentos_a_aprobar?: number[];
}
export interface DocumentoPendienteRequest {
  id_empresa: number;
  id_proveedor?: number;
  fecha_vencimiento_hasta?: string;
  cuentas_contables?: string[];
}