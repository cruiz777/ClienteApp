import { ProductoRequest } from './producto-request';

export interface ProductoEstructuraComercialRequest {
  idproducto?: number | null;
  iddivision?: number | null;
  idsubdivision?: number | null;
  iddepartamento?: number | null;
  idseccion?: number | null;
  idgrupo?: number | null; // el que ya usas en el componente
}

export interface CreateProductoConEstructuraRequest {
  Producto: ProductoRequest;
  Estructura: ProductoEstructuraComercialRequest;
}
