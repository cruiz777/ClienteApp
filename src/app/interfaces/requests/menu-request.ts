export interface MenusRequest {
  id_menu?: number;
  id_modulo: number;
  nombre: string;
  descripcion?: string;
  status: boolean;
  url: string;
}
