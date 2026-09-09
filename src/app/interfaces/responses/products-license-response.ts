export interface ProductoLicenseResponse {
  gtin: string;
  gtin_status: string;
  gpc_category_code: string;
  licence_key: string;
  licence_type: string;
  brand_name: string;
  product_description: string;
  product_image_url?: string;
  net_content_value?: string;
  net_content_unit_code?: string;
  country_of_sale_code: string;
  // Campos adicionales
  producto_id: number;
  cliente_codigo: number;
  nombre_cliente: string;
  codigo_prefijo: string;
  fecha_creacion?: string; // ISO string
  id_usuario?: number;
}

// Para exportación - Producto individual para API externa
export interface ExportProductoResponse {
  gtin: string;
  gtinStatus: string;
  gpcCategoryCode: string;
  licenceKey: string;
  licenceType: string;
  brandName: LocalizedValue[];
  productDescription: LocalizedValue[];
  productImageUrl: string[];
  netContent: NetContentValue[];
  countryOfSaleCode: string[];
}

// Valores localizados
export interface LocalizedValue {
  language: string; // default: "es"
  value: string;
}

// Contenido neto
export interface NetContentValue {
  unitCode: string;
  value: string;
}

// Response de exportación con lotes
export interface ExportProductosResponse {
  totalItems: number;
  totalBatches: number;
  batches: ExportProductosBatch[];
}

// Lote individual de productos
export interface ExportProductosBatch {
  batchNumber: number;
  itemCount: number;
  items: ExportProductoResponse[]; // ✅ Usa ExportProductoResponse
}

export interface ProductoDisplay {
  id: number;
  gtin: string;
  gtinStatus: string;
  licenceKey: string;
  licenceType: string;
  brandName: string;
  productDescription: string;
  productImageUrl?: string;
  netContentValue?: string;
  netContentUnitCode?: string;
  nombreCliente: string;
  codigoPrefijo: string;
  fechaCreacion?: string;
}