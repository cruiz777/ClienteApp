export interface CuponRequest {
  idCliente: number;
  idPrefijo: number;
  serie: boolean;
  serialInicio?: number; // era 'serie: boolean' => esto está mal
  cantidad: number;
  previsualizar: boolean;
  fechaInicio: string; // formato ISO 'YYYY-MM-DD'
  fechaCaducidad?: string; // formato ISO
  estado: boolean;
  idGrupoProducto?: number;
  descripcion?: string;
  usuario?: number;
}
