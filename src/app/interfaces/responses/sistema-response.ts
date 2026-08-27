export interface SistemaResponse {
  id_sistema: number;
  nombre: string;
  descripcion?: string;
  fecha_creacion?: Date;
  status: boolean;
  url: string;
}
