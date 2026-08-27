// balance-diario-detalle-response.model.ts
export interface BalanceDiarioDetalleResponse {
  anio?: string;
  fecha?: string;
  hora?: string;
  debe?: number;
  haber?: number;
  comprobante?: string;
  relacionado?: string;
  cheque?: number;
  beneficiario?: string;
  comentario?: string;
  sustento?: string;
  sri?: string;
  retencion?: string;
  cuenta?: string;
  detalleCuenta?: string;
  codigoAuxiliar?: number;
  nombreAuxiliar?: string;
  fechaCaduca?: string;
  autorizacion?: string;
}
