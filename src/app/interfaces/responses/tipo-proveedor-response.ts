export interface TipoProveedorResponse {
  id_tipo_proveedor: number;
  codigo: string;
  descripcion: string;
  codigo_cuenta_contable?: string;
  activo: boolean;
}