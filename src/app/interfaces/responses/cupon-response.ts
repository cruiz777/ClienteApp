export interface CuponResponse {
  idCupon: number;
  codigoCupon: string;
  idCliente: number;
  idPrefijo: number;
  serial?: number;
  fechaInicio: string; // formato ISO 'YYYY-MM-DD'
  fechaCaducidad?: string;
  fechaCreacion?: string;
  estado?: boolean;
  idGrupoProducto?: number;
  descripcion?: string;
  usuario?: number;
}
