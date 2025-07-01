export interface CuponRequest {
  idCliente: number;
  idPrefijo: number;
  serie: boolean;
  serialInicio?: number;
  descripcion?: string;
//   categoria_producto?: string;
  cantidad: number;
  previsualizar: boolean;
  fechaInicio: string; // ISO format YYYY-MM-DD
  fechaCaducidad?: string; // ISO format
  estado: boolean;
}
