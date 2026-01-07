export interface MotivoNoAnulacionAsientoResponse{
  codigo: string;
  mensaje: string;
  detalle: string;
}

export interface ValidarAnulacionAsientoResponse{
  puedeAnular: boolean;
  motivos: MotivoNoAnulacionAsientoResponse[];
}