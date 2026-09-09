export interface ProductoDetalleResponse {
  // Información del producto
  gtin: string;
  productDescription: string;
  brandName: string;
  netContentValue?: string;
  netContentUnitCode?: string;
  fechaCreacion?: string;
  productGroup?: string;
  productImageUrl?: string;
  gpcCategoryCode: string;
  categoryDescription: string;
  // Unidades logísticas (GTIN-14)
  unidadesLogisticas: UnidadLogistica[];

  // Información de la empresa
  nombreCliente: string;
  licenceKey: string; // GCP - Global Company Prefix
  gln?: string; // Global Location Number
  ciudad?: string;
  canton?: string;
  provincia?: string;
  email?: string;
  direccion?: string;
  website?: string;

  // Campos adicionales
  codigoPrefijo?: string;
  clienteCodigo?: number;
  productoId?: number;
}

export interface UnidadLogistica {
  gtin14: string;
  presentacion: number;
  factor: number;
  descripcion: string;
}