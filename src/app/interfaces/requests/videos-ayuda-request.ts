export interface VideosAyudaRequest {
  id: number;
  idSistema: number;
  idCategoria: number;
  titulo: string;
  urlVideo: string;
  orden: number;
  activo: boolean;
  usuarioCreacion: string;
}
