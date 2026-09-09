export interface SubMenusRequest {
  id_sub?: number;
  id_menu: number;
  nombre: string;
  descripcion?: string;
  status: boolean;
  url: string;
}
