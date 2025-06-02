export interface UsuariosRequest {
  nombre_usuario: string;
  nueva_contrasenia?: string; // ← Agrega esto
  estado: boolean;
  correo?: string;
  fecha_creacion?: string;
  id_empresa: number;
  id_departamento: number;
}

export interface UsuariosEditRequest extends UsuariosRequest {
  id?: number;
}
