export type IsoDateLike = string | Date;

export interface CreateConciliacionDetalleRequest {
  idDetMaestro: number;

  linea?: number | null;
  fechatran?: IsoDateLike | null;
  idMovBancario?: number | null;
  movbancario?: string | null;
  nocomprobante?: string | null;

  cheque?: number | null;
  debito?: number | null;
  credito?: number | null;

  // Mantén C/N porque tu UI trabaja así
  concil?: string | null;

  // Fecha REAL en que se concilia el movimiento
  fechaconcil?: IsoDateLike | null;

  beneficiario?: string | null;
  numdoc?: string | null;
  tipdoc?: string | null;
}

export interface CreateConciliacionRequest {
  // NUEVO: período conciliado, ej. "202601"
  fecconcil: string;

  // Fecha REAL en que se realizó la conciliación
  fechaconcil: IsoDateLike;

  idPlanCuentas: number;

  codprePc?: string | null;
  descripcion?: string | null;

  saldcontini?: number | null;
  saldcontfin?: number | null;
  saldbancini?: number | null;
  saldbancfin?: number | null;

  salconini?: number | null;
  salcondep?: number | null;
  salconchq?: number | null;
  salconnc?: number | null;
  salconnd?: number | null;
  salconbanc?: number | null;
  salcondif?: number | null;

  salconcidep?: number | null;
  salconcichq?: number | null;
  salconcinc?: number | null;
  salconcind?: number | null;

  salconcini?: number | null;
  salconcdep?: number | null;
  salconcchq?: number | null;
  salconcnc?: number | null;
  salconcnd?: number | null;
  salconcbanc?: number | null;
  salconcdif?: number | null;

  comentario?: string | null;

  idEmpresa: number;
  idUsuario: number;

  detalles: CreateConciliacionDetalleRequest[];
}

export interface UpdateConciliacionRequest extends CreateConciliacionRequest {
  idConciliacion?: number | null;
}

export interface GuardarConciliacionParcialDetalleRequest {
  idDetMaestro: number;
  concil: 'S' | 'N';
}

export interface GuardarConciliacionParcialRequest {
  // fecha REAL de guardado parcial
  fechaconcil: IsoDateLike;
  detalles: GuardarConciliacionParcialDetalleRequest[];
}