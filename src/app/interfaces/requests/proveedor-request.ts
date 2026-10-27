export interface ContactoProveedorRequest {
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
}

export interface ProveedorRequest {
  // Persona existente
  id_persona?: number;

  // Datos de contacto (para crear persona)
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigo_postal?: string;

  // Datos directos del proveedor
  nombre_prov?: string;
  ruc_prov?: string;
  email_prov?: string;
  telefono_prov?: string;
  tel1_prov?: string;
  tel2_prov?: string;
  direccion_prov?: string;

  // Datos específicos del proveedor
  codigo_proveedor?: string;
  nombre_comercial?: string;
  web_proveedor?: string;

  // Clasificación
  id_tipo_proveedor?: number;
  id_tipo_contribuyente?: number;
  id_ciudad?: number;

  // Retenciones
  porcentaje_retencion_fb?: number;
  codigo_retencion_fb?: string;
  porcentaje_retencion_fs?: number;
  codigo_retencion_fs?: string;
  porcentaje_retencion_ib?: number;
  codigo_retencion_ib?: string;
  porcentaje_retencion_is?: number;
  codigo_retencion_is?: string;

  // Condiciones comerciales
  tiempo_entrega?: number;
  plazo_pago?: number;
  no_cambiar_costo_producto: boolean;

  // Contable
  id_plan_cuenta?: number;
  codigo_cuenta?: string;

  // Otros
  observaciones?: string;
  usuario_creacion?: number;
  usuario_modificacion?: number;

  // Contactos adicionales
  contactos?: ContactoProveedorRequest[];
}