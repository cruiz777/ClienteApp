export interface LoginCajaResponse {
  id_autorizacion_usuario: number;
  id_autorizacion_caja: number;
  doc_fi?: number;   // 1=factura, 2=NC (si lo envías)
  numero?: number;
  estado?: string;
}

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

  // ✅ ahora arreglo
  cajas: LoginCajaResponse[];
}
