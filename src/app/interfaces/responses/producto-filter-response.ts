export interface ClienteReporteResponse {
  nombreCliente: string;
  ruc: string;
  gln: string;
  gs1: string;
}

export interface ProductoResponse {
  codpro: string;
  despro: string;
  marca: string;
  contenido: string;
  um: string;
  gtin: string;
  feccre: string;
}

export interface ClienteConProductosResponse {
  cliente: ClienteReporteResponse;
  productos: ProductoResponse[];
}
