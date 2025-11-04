export interface LoginUsuarioResponse {
  id_usuario: number;
  nombre_usuario: string;
  correo?: string | null;
  estado: boolean;
  id_empresa: number;
  nombreE: string;
  nombreD: string;
  id_perfil: number;
  perfil: string;
  id_autorizacion_usuario:number;
  id_autorizacion_caja:number;
}

