// ===== REQUEST PRINCIPAL =====
export interface CreatePagoProveedorRequest {
  idEmpresa: number;
  idUsuario: number;
  idZona: number;
  idCodContable: number;
  beneficiario: string;
  fechatransaccion: string; // ISO format: "2025-12-23T10:30:00"
  observaciones?: string;
  idCentroCostos?: number;
  idLocal: number;
  facturas: FacturaPagoItem[];
  formasPago: FormaPagoItem[];
}

// ===== ITEM DE FACTURA =====
export interface FacturaPagoItem {
  idCuentaPorPagar: number;
  nocomp: string;
  montoPagar: number;
  idPlanCuentasCxP: number;
  idCodContableCxP: number;
  idTipComp: number;
}

// ===== ITEM DE FORMA DE PAGO =====
export interface FormaPagoItem {
  idFormaPago: number;
  descripcion?: string;
  monto: number;
  idPlanCuentas: number;
  idCodContable?: number;
  banco?: string;
  cuentaBanco?: string;
  numeroCheque?: string;
  referencia?: string;
  autorizacion?: string;
}