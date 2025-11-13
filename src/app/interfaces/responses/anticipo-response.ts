export interface AnticipoResponse {
  id_anticipo: number;
  numero_anticipo: string | null;
  consecutivo: string | null;
  clientes_codigo: number | null;
  nombre_cliente: string | null;
  monto: number | null;
  fecha: string | null; // DateTime como string ISO
  caja: string | null;
  concepto: string | null;
  id_forma_pago: number | null;
  lote: string | null;
  descripcion_forma_pago: string | null;
  responsable: string | null;
  movimientos_creados: string[];
}

export interface AnticipoDetalleResponse {
  id_anticipo: number;
  numero_anticipo: string | null;
  consecutivo: string | null;
  caja: string | null;
  responsable: string | null;
  fecha: string | null;
  clientes_codigo: number | null;
  nombre_cliente: string | null;
  monto: number | null;
  monto_inicial: number | null;
  valor_original: number | null;
  concepto: string | null;
  utilizado: boolean;
  cancelado: boolean;
  estado: boolean | null;
  id_forma_pago: number | null;
  descripcion_forma_pago: string | null;
  id_bancos_terceros: number | null;
  nro_cuenta: string | null;
  lote: string | null;
  nro_cheque: string | null;
  propietario: string | null;
  nro_documento: string | null;
  nombre: string | null;
  id_plazo_tarjeta: number | null;
  autorizacion: string | null;
  ate_numero_atencion: number | null;
  pac_historia_clinica: number | null;
  usuario_ingreso: string | null;
  fecha_ingreso: string | null;
  usuario_anula: string | null;
  fecha_anula: string | null;
  arqueada: boolean | null;
  fecmod: string | null;
  id_local: number | null;
  numpag: string | null;
  num_liquidacion: number;
  id_tipo_anticipo: number;
  asiento_contable: number | null;
  tipo_asiento: string | null;
  asiento_contable_dev: number | null;
  tipo_asiento_dev: string | null;
  movimientos_estado_cuenta: MovimientoEstadoCuentaInfo[] | null;
}

export interface MovimientoEstadoCuentaInfo {
  id: number;
  tipo_documento: string | null;
  codigo_documento: string | null;
  numero_documento: string | null;
  fecha: string | null;
  debe: number | null;
  haber: number | null;
  observacion: string | null;
  pago_anulado: boolean | null;
}


export interface SiguienteIdAntiicpo {
  next_numero: number;
}
