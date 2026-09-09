export interface CategoriaVideosRequest {
  id: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  usuarioCreacion: string;
}