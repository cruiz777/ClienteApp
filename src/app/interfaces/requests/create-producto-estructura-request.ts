import { ProductoRequest } from './producto-request';

export interface ProductoEstructuraComercialRequest {
  idproducto?: number;
  iddivision?: number;
  idsubdivision?: number;
  iddepartamento?: number;
  idseccion?: number;
  idgrupo?: number;
}

export interface CreateProductoConEstructuraRequest {
  producto: ProductoRequest;
  estructura: ProductoEstructuraComercialRequest;
}
