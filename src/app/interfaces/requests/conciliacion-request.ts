export type IsoDateLike = string | Date;

export interface CreateConciliacionDetalleRequest {
  idDetMaestro: number;

  linea?: number | null;            // opcional
  fechatran?: IsoDateLike | null;   // "2026-02-26T09:15:00"
  idMovBancario?: number | null;
  movbancario?: string | null;
  nocomprobante?: string | null;

  cheque?: number | null;
  debito?: number | null;
  credito?: number | null;

  concil?: string | null;           // "C", "S"/"N" (según tu regla)
  fechaconcil?: IsoDateLike | null; // "2026-02-26T00:00:00"

  beneficiario?: string | null;
  numdoc?: string | null;
  tipdoc?: string | null;
}

export interface CreateConciliacionRequest {
  fechaconcil: IsoDateLike; // obligatorio
  idPlanCuentas: number;    // obligatorio

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

  idEmpresa: number; // obligatorio
  idUsuario: number; // obligatorio

  detalles: CreateConciliacionDetalleRequest[]; // obligatorio (>=1)
}

export interface UpdateConciliacionRequest extends CreateConciliacionRequest {
  idConciliacion?: number | null; // opcional (el id real va por ruta)
}