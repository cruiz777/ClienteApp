export interface UsuariosRequest {
  nombre_usuario: string;
  contrasenia_hash: string;
  estado: boolean;
  correo?: string;
  fecha_creacion?: string; // o Date, si deseas manejarlo con objeto
  id_empresa: number;
  id_departamento: number;
}

export interface UsuariosEditRequest {
  id_usuario: number;
  nombre_usuario: string;
  contrasenia_hash: string;
  estado: boolean;
  correo?: string;
  fecha_creacion?: string; // o Date, si deseas manejarlo con objeto
  id_empresa: number;
  id_departamento: number;
}
