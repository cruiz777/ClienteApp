export interface ProductoEstructuraComercialRequest {
  idproducto?: number;      // Opcional: filtra por un producto específico
  iddivision?: number;      // Nivel 2
  idsubdivision?: number;   // Nivel 3
  iddepartamento?: number;  // Nivel 4
  idseccion?: number;       // Nivel 5
  idgrupo?: number;         // Nivel 6
}
