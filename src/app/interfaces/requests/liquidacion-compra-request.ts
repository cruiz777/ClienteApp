// liquidacion-compra-request.ts

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** ===================== ASIENTO (CAB) ===================== */
export interface LiquidacionCompraRequest {
  IdCabMaestro: number;
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idTipoAsiento: number;
  tipdoc: string;
  numdoc: number;
  anio: string;
  fechatransaccion: string; // ISO string
  fechaingreso: string;     // ISO string
  observacion: string | null;
  totdebe: number;
  tothaber: number;
  beneficiario: string | null;
  cierre: string | null;
  fechacierre: string | null;
  solicitado: string | null;
  depto: string | null;
  autorizado: string | null;
  homCodigo: number | null;
  estado: boolean;
  modulo: number;

  detalles: LiquidacionCompraDetalleAsientoRequest[];

  /** ===================== LIQUIDACION ===================== */
  liquidacion: LiquidacionCompraLiquidacionRequest;
}

/** ===================== ASIENTO (DET) ===================== */
export interface LiquidacionCompraDetalleAsientoRequest {
  IdDetMaestro: number;
  IdCabMaestro: number;
  numlinea: number;
  anio: string;
  fechatransaccion: string | null; // ISO o YYYY-MM-DD
  fechaingreso: string | null;     // ISO
  hora: string | null;

  idZona: number;
  idCentroCostos: number | null;
  idLocal: number | null;

  idPlanCuentas: number | null;
  codprePc: string | null;

  idCodContable: number | null;
  nocomprobante: string | null;
  docurelacionado: string | null;

  cheque: number | null;
  beneficiario: string | null;

  debe: number;
  haber: number;

  comentario: string | null;

  idMovBancario: number | null;
  movbancario: string | null;

  cierre: string | null;
  fechacierre: string | null;

  conciliado: string | null;
  fechaconciliado: string | null;

  idSustentoTrib: number | null;
  idTipoCompSri: number | null;
  autorizacion: string | null;
  fechacaduca: string | null;

  idTipoRetencion: number | null;
  idProyecto: number | null;
  idSubproyecto: number | null;

  transferido: boolean;
  fechatransferido: string | null;

  fechavencimiento: string | null;

  idConciliacion: number | null;
  valorLetras: string | null;

  estadoIngreso: boolean;

  autorizacionRelacionado: string | null;
  fechaCadRelacionado: string | null;

  /** Extras que ya manejabas */
  idPorIva?: number | null;
  porcentaje?: number | null;
}

/** ===================== LIQUIDACION ===================== */
export interface LiquidacionCompraLiquidacionRequest {
  cabecera: LiquidacionCompraCabeceraRequest;
  detalles: LiquidacionCompraDetalleRequest[];
  formasPago: LiquidacionCompraFormaPagoRequest[];
}

export interface LiquidacionCompraCabeceraRequest {
  numliquida: string | null;
  caja: string | null;
  idCodContable: number | null;
  ruc: string | null;

  fecha: string | null;     // ISO
  fechaing: string | null;  // ISO

  observacion: string | null;

  subtotal: number;
  coniva: number;
  siniva: number;
  iva: number;
  total: number;

  autorizacion: string | null;
  fechacad: string | null; // ISO

  idTipoCompSri: number | null;
  tipdoc: string | null;
  numdoc: string | null;
}

export interface LiquidacionCompraDetalleRequest {
  codpro: string | null;
  descripcion: string | null;
  cantidad: number;
  pvpunit: number;
  iva: number;
  total: number;
  bien: number;
  servicio: number;
  linea: number;

  idPlanCuentas: number | null;
  ctaContable: string | null;
  caja: string | null;
  idPorIva: number | null;
  porcentaje: number | null;
}

export interface LiquidacionCompraFormaPagoRequest {
  idFormaPagoSri: number | null;
  codigofpago: string | null;
  valor: number;
  plazo: number;
}

/** ===================== FACTORY (opcional) ===================== */
export function createEmptyLiquidacionCompraRequest(): LiquidacionCompraRequest {
  const nowIso = new Date().toISOString();
  return {
    IdCabMaestro: 0,
    idZona: 0,
    idUsuario: 0,
    idEmpresa: 0,
    idTipoAsiento: 0,
    tipdoc: '',
    numdoc: 0,
    anio: '',
    fechatransaccion: nowIso,
    fechaingreso: nowIso,
    observacion: null,
    totdebe: 0,
    tothaber: 0,
    beneficiario: null,
    cierre: null,
    fechacierre: null,
    solicitado: null,
    depto: null,
    autorizado: null,
    homCodigo: null,
    estado: true,
    modulo: 6, // por defecto, según tu JSON (modulo 6)
    detalles: [],
    liquidacion: {
      cabecera: {
        numliquida: null,
        caja: null,
        idCodContable: null,
        ruc: null,
        fecha: nowIso,
        fechaing: nowIso,
        observacion: null,
        subtotal: 0,
        coniva: 0,
        siniva: 0,
        iva: 0,
        total: 0,
        autorizacion: null,
        fechacad: nowIso,
        idTipoCompSri: null,
        tipdoc: null,
        numdoc: null,
      },
      detalles: [],
      formasPago: [],
    },
  };
}
