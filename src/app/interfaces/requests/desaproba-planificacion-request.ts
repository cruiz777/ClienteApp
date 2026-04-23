export interface DesaprobarPlanificacionRequest {
  numero_transaccion: number;
  id_empresa: number;
  id_usuario: number;
  password: string;
  motivo: string;
}