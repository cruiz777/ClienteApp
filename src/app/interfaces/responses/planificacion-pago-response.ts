
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