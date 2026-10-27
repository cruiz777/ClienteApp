import { ProductoRequest } from './producto-request';
import { StockRequest } from './stocks-request';

export interface ProductoEstructuraComercialRequest {
  idproducto?: number | null;
  iddivision?: number | null;
  idsubdivision?: number | null;
  iddepartamento?: number | null;
  idseccion?: number | null;
  idgrupo?: number | null;
}

export interface CreateProductoConEstructuraRequest {
  Producto: ProductoRequest;
  Estructura: ProductoEstructuraComercialRequest;
  Stocks?: StockRequest[] | null;
}
