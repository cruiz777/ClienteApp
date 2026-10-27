// ===== RESPONSE PRINCIPAL DEL PAGO =====
export interface PagoProveedorResponse {
  idCabMaestro: number;
  numAsiento: number;
  totalPagado: number;
  beneficiario: string;
  fechaPago: string; // "2025-12-23"
  facturasPagadas: FacturaPagadaInfo[];
  formasPagoUsadas: FormaPagoUsadaInfo[];
}

export interface FacturaPagadaInfo {
  idCuentaPorPagar: number;
  nocomp: string;
  montoPagado: number;
  nuevoSaldo: number;
  estadoPago: string; // "N" | "A" | "P"
}

export interface FormaPagoUsadaInfo {
  descripcion: string;
  monto: number;
  referencia?: string;
}

// ===== RESPONSE DE FACTURAS PENDIENTES =====
export interface FacturaPendienteResponse {
  idCuentaPorPagar: number;
  
  // Proveedor
  codigoContable: number;
  identificacionProveedor?: string;
  nombreProveedor: string;
  
  // Asiento
  tipoAsiento?: string;
  numAsiento: number;
  
  // Cuenta
  idPlanCuentas: number;
  cuentaContable?: string;
  nombreCuenta?: string;
  
  // Factura
  nocomp: string;
  numdoc?: string;
  fechatran?: string;
  fechaVenc?: string;
  
  // Montos
  debe: number;
  haber: number;
  montoOriginal: number;
  saldoPendiente: number;
  
  // Estado
  estadopago: string;
  comentario?: string;
  tipoMovimiento?: string;
  vencida: boolean;
  esAnticipo?: boolean; 
}

// ===== RESPONSE DE AUTOCOMPLETE PROVEEDORES =====
export interface CodigoContableSummaryResponse {
  idCodContable: number;
  identificacion?: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  razonSocial?: string;
}

// ===== WRAPPER GENÉRICO API =====
export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T | null;
  message: string;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  message?: string;
}