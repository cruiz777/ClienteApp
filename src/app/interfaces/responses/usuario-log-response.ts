export interface LoginCajaResponse {
  id_autorizacion_usuario: number;
  id_autorizacion_caja: number;

  // ✅ viene del backend
  id_tipo_documento?: number; // 1=factura, 2=NC

  // opcionales (vienen también)
  caja?: number;
  numero?: number | null;
  numero_autorizacion?: string | null;
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
