export interface ProductoProveedorResponse {
  id_producto_proveedor: number;
  id_producto: number;
  id_proveedor: number;

  codigo_producto: string;
  codigo_proveedor: string;

  fecha_ingreso?: string | null; // ISO
  costo_compra?: number | null;
  descuento_general?: number | null;
  descuento_1?: number | null;
  descuento_2?: number | null;
  descuento_3?: number | null;
  descuento_4?: number | null;

  costo_neto?: number | null;
  porcentaje_pvp?: number | null;
  producto_consignacion?: boolean | null;
  unidad_compra?: string | null;
  valor_unidad_compra?: number | null;

  fecha_modificacion?: string | null; // ISO
  activo: boolean;
  es_proveedor_principal: boolean;
  fecha_ultima_compra?: string | null; // ISO
  fecha_creacion: string; // ISO

  // Datos adicionales para mostrar en listados
  nombre_producto?: string | null;
  nombre_proveedor?: string | null;
}