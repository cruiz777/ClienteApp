export interface VideosAyudaResponse {
  id: number;
  idSistema: number;
  idCategoria: number;
  titulo: string;
  urlVideo: string;
  orden: number;
  activo: boolean;
  fechaCreacion: string;
  usuarioCreacion: string;
  nombreCategoria?: string;
  nombreSistema?: string;
}
