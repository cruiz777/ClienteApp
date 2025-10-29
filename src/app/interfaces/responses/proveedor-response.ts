// src/app/interfaces/responses/proveedor-response.ts

export interface ProveedorResponse {
  // ==================== IDs ====================
  id_proveedor: number;
  id_persona: number;

  // ==================== IDENTIFICACIÓN ====================
  codigo_proveedor: string;
  
  // ✅ Datos de Persona
  documento: string;
  tipo_documento?: string | null;
  tipo_persona?: string | null;
  nombre_persona: string;

  // ==================== PROVEEDOR ====================
  nombre_comercial?: string | null;
  web_proveedor: string;

  // ==================== UBICACIÓN ====================
  ciudad?: string | null;
  provincia?: string | null;
  pais?: string | null;
  
  // ✅ Direcciones de Persona
  direccion?: string | null;
  codigo_postal?: string | null;

  // ==================== CONTACTO (de Persona) ====================
  email?: string | null;
  telefono?: string | null;

  // ==================== TIPO Y CLASIFICACIÓN ====================
  tipo_proveedor?: string | null;
  tipo_contribuyente?: string | null;
  tipo_producto?: string | null;
  codigo_ean?: string | null;
  origen_proveedor?: string | null;
  tipo_nacional_internacional: boolean;
  tipo_contado: boolean;
  tipo_produccion: number;

  // ==================== RETENCIONES ====================
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

  // ==================== COMERCIAL ====================
  tiempo_entrega?: number | null;
  plazo_pago?: number | null;
  porcentaje_pvp?: number | null;
  no_cambiar_costo_producto: boolean;

  // ==================== CONTABLE ====================
  codigo_cuenta?: string | null;

  // ==================== OTROS ====================
  observaciones?: string | null;

  // ==================== CONTACTOS DEL PROVEEDOR ====================
  contactos?: ProveedorContactoResponse[] | null;

  // ==================== AUDITORÍA ====================
  activo: boolean;
  fecha_alta?: string | null; // DateTime se convierte a ISO string
  fecha_modificacion?: string | null; // DateTime se convierte a ISO string
  fecha_creacion: string; // DateTime se convierte a ISO string
  usuario_creacion?: number | null;
}

// ✅ Interface para contactos del proveedor
export interface ProveedorContactoResponse {
  id_contacto: number;
  nombre_contacto: string;
  cargo?: string | null;
  telefono?: string | null;
  email?: string | null;
  activo: boolean;
}