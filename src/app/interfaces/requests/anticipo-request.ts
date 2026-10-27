export interface CreateAnticipoRequest {
  caja: string | null;
  responsable: string | null;
  clientes_codigo: number;
  monto: number;
  concepto: string | null;
  id_forma_pago: number;
  id_local: number;
  id_tipo_anticipo: number;
  id_bancos_terceros?: number | null;
  nro_cuenta?: string | null;
  lote?: string | null;
  nro_cheque?: string | null;
  propietario?: string | null;
  nro_documento?: string | null;
  nombre?: string | null;
  id_plazo_tarjeta?: number | null;
  autorizacion?: string | null;
  ate_numero_atencion?: number | null;
  pac_historia_clinica?: number | null;
}


export interface AnularAnticipoRequest {
  id_anticipo: number;
  motivo_anulacion: string;
  usuario_anula: string;
  fecha_anulacion: string;
}
//Interfaz para el request de reporte de anticipos
export interface ReporteAnticipoRequest {
  fechaInicial: string;      // ISO format: "2025-11-01"
  fechaFinal: string;        // ISO format: "2025-11-18"
  idTipoAnticipo?: number;   // null = TODOS
  estadoFiltro: EstadoAnticipoFiltro;
  page: number;
  pageSize: number;
}

export enum EstadoAnticipoFiltro {
  Todos = 0,
  Utilizados = 1,
  SinUtilizar = 2
}
