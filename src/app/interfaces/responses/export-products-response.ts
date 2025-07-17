export interface ProductoLicenseQuery {
  nombreCliente?: string;
  codigoPrefijo?: string;
  fechaDesde?: string; // formato YYYY-MM-DD
  fechaHasta?: string; // formato YYYY-MM-DD
  fechaIgual?: string; // formato YYYY-MM-DD
  ruc?: string;
  estadoPrefijo?: boolean; // true = activo, false = inactivo, null = todos
  estadoEmpresa?: number; // 1 = activo, 2 = inactivo, null = todos
  operadorFecha?: number; // 0=Igual, 1=Mayor, 2=MenorIgual
  estadoGtin?: boolean; // true = activo, false = inactivo, null = todos
  idUsuario?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface ExportProductosQuery {
  nombreCliente?: string;
  codigoPrefijo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  fechaIgual?: string;
  ruc?: string;
  estadoPrefijo?: boolean;
  estadoEmpresa?: number;
  operadorFecha?: number;
  estadoGtin?: boolean;
  idUsuario?: number;
  batchSize?: number; // default: 1000
}