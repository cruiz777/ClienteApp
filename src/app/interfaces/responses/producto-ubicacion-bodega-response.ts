export interface ProductoUbicacionBodegaResponse {
  idProductoUbicacion?: number;
  idProducto?: number;
  idLocal?: number;
  idColumna?: number;
  idNivel?: number;
  idArea?: number;
  nombreLocal?: string;
  codigoArea?: string;
  codigoColumna?: string;
  codigoNivel?: string;

  _tempId?: string;
  _isNew?: boolean;
  _markedForDeletion?: boolean;
  _modificado?: boolean;
}