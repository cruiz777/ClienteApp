export interface SubMenuRequest {
  id_sub?: number;  // Opcional para CREATE
  id_menu: number;  // Requerido - ID del menú padre
  nombre: string;
  descripcion?: string;
  status: boolean;
  url?: string;
}