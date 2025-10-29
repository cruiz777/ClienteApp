export interface ProveedorResponse {
  id_proveedor: number;
  id_persona: number;
  codigo_proveedor: string;
  nombre_proveedor?: string | null;
  ruc_proveedor?: string | null;
  nombre_comercial?: string | null;

  // Ubicación
  codigo_ciudad?: string | null;
  codigo_pais?: number | null;
  direccion_proveedor?: string | null;
  casilla_proveedor?: string | null;

  // Contacto
  email_proveedor?: string | null;
  telefono_proveedor?: string | null;
  telefono_1_proveedor?: string | null;
  telefono_2_proveedor?: string | null;
  fax_proveedor?: string | null;
  web_proveedor?: string | null;
  contacto_proveedor?: string | null;
  representante_proveedor?: string | null;

  // Tipo y Clasificación
  tipo_proveedor?: string | null;
  tipo_producto?: string | null;
  codigo_ean?: string | null;
  origen_proveedor?: string | null;
  tipo_nacional_internacional: boolean;
  tipo_contado: boolean;
  tipo_produccion: number;

  // Retenciones
  porcentaje_retencion?: number | null;
  motivo_retencion?: string | null;
  tarifa: boolean;
  porcentaje_retencion_fb?: number | null;
  codigo_retencion_fb?: string | null;
  porcentaje_retencion_fs?: number | null;
  codigo_retencion_fs?: string | null;
  porcentaje_retencion_ib?: number | null;
  codigo_retencion_ib?: string | null;
  porcentaje_retencion_is?: number | null;
  codigo_retencion_is?: string | null;
  autorizacion?: string | null;
  fecha_caducidad?: string | null; // ISO

  // Comercial
  tiempo_entrega?: number | null;
  forma_pago?: string | null;
  plazo_pago?: number | null;
  plazo_pago_c?: number | null;
  descuento_global_monto?: string | null;
  porcentaje_pvp?: number | null;
  porcentaje_descuento?: number | null;
  monto_descuento?: number | null;
  no_cambiar_costo_producto: boolean;

  // Bancario
  codigo_banco?: string | null;
  cuenta_corriente?: string | null;

  // Contable
  codigo_cuenta?: string | null;

  // Otros
  observaciones?: string | null;

  // Auditoría
  activo: boolean;
  fecha_alta?: string | null; // ISO
  fecha_modificacion?: string | null; // ISO
  fecha_creacion: string; // ISO

  // Datos de persona (para mostrar en listados)
  documento?: string | null;
  nombre_persona?: string | null;
}