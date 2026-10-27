export interface UsuariosRequest {
  id_persona: number;
  nombre_usuario: string;
  contrasena_hash?: string; // ← Agrega esto
  estado: boolean;
  correo?: string;
  fecha_creacion?: string;
  id_empresa: number;
  id_departamento: number;
  fecha_bloqueo?: string;
  fecha_caducidad?: string;
}

export interface UsuariosEditRequest extends UsuariosRequest {
  id?: number;
}
