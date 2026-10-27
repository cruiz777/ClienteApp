export interface ProductoProveedorRequest {
  id_producto: number;
  id_proveedor: number;

  costo_compra?: number | null;
  descuento_general?: number | null;
  descuento_1?: number | null;
  descuento_2?: number | null;
  descuento_3?: number | null;
  descuento_4?: number | null;

  porcentaje_pvp?: number | null;
  producto_consignacion?: boolean | null;
  unidad_compra?: string | null;
  valor_unidad_compra?: number | null;

  es_proveedor_principal: boolean;
}