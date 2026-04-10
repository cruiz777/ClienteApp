
export interface DocumentoPendienteResponse {
  // Identificación
  id_cuenta_por_pagar: number;
  numero_linea: number | null;
  
  // Proveedor
  id_proveedor: number;
  nombre_proveedor: string;
  identificacion: string | null;
  
  // Tipo de movimiento
  id_tipo_movimiento: number;
  descripcion_tipo_movimiento: string | null;
  
  // Contabilidad
  tipo_asiento: string | null;
  numero_asiento: number;
  cuenta_contable: string | null;
  numero_comprobante: string;
  numero_documento: string | null;
  
  // Fechas
  fecha_transaccion: string | null;
  fecha_vencimiento: string | null;
  dias_vencidos: number;
  esta_vencido: boolean;
  
  // Montos
  total_documento: number;
  debe: number;
  haber: number;
  saldo: number;
  comision: number;
  aporte: number;
  retencion_fuente: number;
  retencion_iva: number;
  
  // Estado
  estado_pago: string | null;
  estado: string | null;
  
  // Editables
  seleccionado: boolean;
  tipo_pago_seleccionado: string | null;
  monto_a_pagar: number;
  exceso: number | null;
  id_forma_pago: number | null;
  descripcion_forma_pago: string | null;
  cuenta_banco: string | null;
  numero_cheque: string | null;
  observaciones: string | null;
}

export interface FormaPagoResponse {
  id: number;
  descripcion: string;
  aplica_plan_pagos: number;
}


export interface AsientoGeneradoDto {
  tipo_documento: string;
  numero_documento: number;
  id_proveedor: number;
  nombre_proveedor: string;
  total_debe: number;
  total_haber: number;
}

export interface PagoProcesadoResponse {
  numero_transaccion: number;
  asientos_generados: AsientoGeneradoDto[];
  total_pagado: number;
  documentos_procesados: number;
}

export interface PlanificacionCreadaResponse {
  numero_transaccion: number;
  documentos_planificados: number;
  total_planificado: number;
  estado_planificacion: string;
}
export interface PlanificacionPagoResponse {
  // IDENTIFICACIÓN
  id_planificacion: number;
  id_cuenta_por_pagar: number | null;
  num_transaccion: number;

  // PROVEEDOR
  id_proveedor: number | null;
  codigo_proveedor: number;
  nombre_proveedor: string;
  identificacion_proveedor: string | null;

  // FECHAS
  fecha: string | null;
  fecha_vencimiento: string | null;
  fecha_ingreso: string;
  fecha_aprueba: string | null;

  // FORMA DE PAGO
  id_forma_pago: number | null;
  descripcion_forma_pago: string | null;
  cuenta_banco: string | null;

  // MONTOS
  valor_pago: number;
  total: number;
  total_pago_planilla: number;
  comision: number;
  aporte: number;
  retencion: number | null;
  retencion_iva: number;
  egreso: number;

  // ESTADOS
  estado: string;
  estado_pago: string | null;
  estado_planificacion: number;
  estado_aprueba: number | null;

  // USUARIOS
  usuario_ingreso: number;
  nombre_usuario_ingreso: string | null;
  usuario_aprueba: number | null;
  nombre_usuario_aprueba: string | null;

  // INFORMACIÓN ADICIONAL
  comentario: string | null;
  paciente: string | null;
  observacion_asiento: string | null;
  id_empresa: number | null;

  // INFORMACIÓN DEL DOCUMENTO ORIGINAL
  numero_documento: string | null;
  tipo_comprobante: string | null;

  // MONTOS DEL DOCUMENTO ORIGINAL
  total_documento: number;
  debe_documento: number;
  haber_documento: number;
  saldo_documento: number;
  retencion_fuente_documento: number;
  retencion_iva_documento: number;
}
// ========== ACTUALIZAR PLANIFICACIÓN ==========

export interface DocumentoPagoActualizadoDto {
  id_cuenta_por_pagar: number;
  tipo_pago: string;  // 'P' | 'A' | 'N'
  valor_pago: number;
  comentario?: string;
}

export interface ActualizarPlanificacionRequest {
  numero_transaccion: number;
  id_empresa: number;
  id_usuario: number;
  fecha_pago?: string;  // 'YYYY-MM-DD' - opcional
  fecha_vencimiento?: string;  // 'YYYY-MM-DD' - opcional
  id_forma_pago?: number;  // opcional
  cuenta_banco?: string;  // opcional
  observacion?: string;  // opcional
  documentos: DocumentoPagoActualizadoDto[];
}

export interface PlanificacionActualizadaResponse {
  numero_transaccion: number;
  documentos_actualizados: number;
  total_planificado: number;
}