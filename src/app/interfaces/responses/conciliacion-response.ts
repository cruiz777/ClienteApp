
export interface ConciliacionDetalleResponse {

// Campos que el backend SÍ devuelve en GetById
  idDetConciliacion?: number;     // <-- NUEVO (opcional para reutilizar)
  idConciliacion?: number;        // <-- NUEVO (opcional para reutilizar)

  // Si tu API devuelve más campos (PK del detalle, etc.) puedes agregarlos aquí sin problema.
  idDetMaestro: number;

  linea?: number | null;
  fechatran?: string | null;      // ISO sin Z
  idMovBancario?: number | null;
  movbancario?: string | null;
  nocomprobante?: string | null;

  cheque?: number | null;
  debito?: number | null;
  credito?: number | null;

  concil?: string | null;
  fechaconcil?: string | null;

  beneficiario?: string | null;
  numdoc?: string | null;
  tipdoc?: string | null;
}

export interface ConciliacionResponse {
  idConciliacion: number;

  fechaconcil: string;     // ISO sin Z
  fecconcil?: string | null; // "yyyyMM" (si tu API lo expone)

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

  detalles: ConciliacionDetalleResponse[];
}