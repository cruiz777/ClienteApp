export interface AnticipoLiquidaResponse {
  id_anticipo_liquida: number;
  num_liquidacion: number;
  fecha_liquidacion: string | null; // DateOnly como string ISO
  id_anticipo: number;
  responsable: string | null;
  clientes_codigo: number | null;
  nombre_cliente?: string | null;
  valor_liquidado: number | null;
  concepto: string | null;
  id_forma_pago: number | null;
  asiento_contable: number | null;
  tipo_asiento: string | null;
  cod_beneficiario: string | null;
  beneficiario: string | null;
  tipo_pago: string | null;
  tipo_cuenta: string | null;
  nro_cuenta: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  cedula: string | null;
  id_bancos_terceros?: number | null;
  fecha_ingreso: string | null;
  usuario_ingreso: string | null;
}
export interface NextNumeroLiquidacionResponse {
  next_numero: number;
}
