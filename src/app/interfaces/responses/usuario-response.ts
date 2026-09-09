export interface UsuariosResponse {
  id_usuario: number;
  id_persona: number;
  nombre_usuario: string;
  estado: boolean;
  correo?: string;
  fecha_creacion?: string;
  id_departamento: number;
  nombre_departamento?: string;
  nombre_perfil?: string;
  id_perfil?: number;
  fecha_bloqueo?: string; 
  esta_bloqueado?: boolean;
  fecha_caducidad?: string;
}
