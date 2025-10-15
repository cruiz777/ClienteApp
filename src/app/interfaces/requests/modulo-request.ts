export interface ModulosRequest {
  id_modulo?: number;
  id_sistema: number;
  nombre: string;
  descripcion?: string;
  status: boolean;
  url: string;
}
