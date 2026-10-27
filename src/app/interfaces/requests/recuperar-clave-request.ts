export interface RecuperarClaveRequest {
  correo: string;
  id_empresa: number;
}

export interface UpdateClaveRequest {
  token: string;
  nuevaClave: string;
}
