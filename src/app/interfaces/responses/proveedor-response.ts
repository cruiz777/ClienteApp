// src/app/core/interfaces/proveedor.interface.ts

export interface ProveedorContactoResponse {
  id_contacto?: number;
  id_proveedor?: number;
  nombre_contacto: string;
  cargo?: string;
  departamento?: string;
  telefono?: string;
  telefono_movil?: string;
  email?: string;
  extension?: string;
  tipo_contacto?: string;
  es_principal: boolean;
  observaciones?: string;
  activo?: boolean;
  fecha_creacion?: string;
}

export interface ProveedorResponse {
  // IDs
  id_proveedor: number;
  id_persona: number;

  // Identificación
  codigo_proveedor: string;

  // Datos directos del proveedor
  nombre_prov?: string;
  ruc_prov?: string;
  email_prov?: string;
  telefono_prov?: string;
  tel1_prov?: string;
  tel2_prov?: string;
  direccion_prov?: string;
  codigo_postal?: string;

  // Datos de persona (referencia)
  documento?: string;
  tipo_documento?: string;
  tipo_persona?: string;
  nombre_persona?: string;

  // Proveedor
  nombre_comercial?: string;
  web_proveedor: string;

  // Ubicación
  id_ciudad?: number;
  ciudad?: string;
  provincia?: string;
  pais?: string;

  // Tipo y clasificación
  id_tipo_proveedor?: number;
  tipo_proveedor?: string;
  id_tipo_contribuyente?: number;
  tipo_contribuyente?: string;

  // Retenciones
  porcentaje_retencion_fb?: number;
  codigo_retencion_fb?: string;
  porcentaje_retencion_fs?: number;
  codigo_retencion_fs?: string;
  porcentaje_retencion_ib?: number;
  codigo_retencion_ib?: string;
  porcentaje_retencion_is?: number;
  codigo_retencion_is?: string;

  // Comercial
  tiempo_entrega?: number;
  plazo_pago?: number;
  no_cambiar_costo_producto: boolean;

  // Contable
  id_plan_cuenta?: number;
  codigo_cuenta?: string;

  // Otros
  observaciones?: string;

  // Contactos
  contactos: ProveedorContactoResponse[];

  // Auditoría
  activo: boolean;
  fecha_modificacion?: string;
  fecha_creacion: string;
  usuario_creacion?: number;
}