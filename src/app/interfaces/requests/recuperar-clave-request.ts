export interface RecuperarClaveRequest {
  correo: string;
}

export interface UpdateClaveRequest {
  token: string;
  nuevaClave: string;
}
