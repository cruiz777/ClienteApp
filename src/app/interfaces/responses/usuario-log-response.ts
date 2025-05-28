export interface LoginUsuarioResponse {
  id_usuario: number;
  nombre_usuario: string;
  correo: string | null;
  estado: boolean;
  id_empresa: number;
  nombre_empresa: string;        // Empresa
  nombre_departamento: string;        // Departamento
  id_perfil: number;
  nombre_perfil: string;
  id_departamento: string;
  id_persona: number;
}

