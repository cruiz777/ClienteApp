export interface CategoriaVideosResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  fechaCreacion: string;
  usuarioCreacion: string;
}
