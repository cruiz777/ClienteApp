export interface RetencionesResumenResponse {
  idempresa: number;
  idcabmaestro: number;
  numdoc: number;
  numlinea: number;
  fechatransaccion: string; // viene como ISO desde .NET (DateTime)
  hora: string;
  tipdoc: string;
  tipocomp: number;
  descomp: string;
  idcodcontable: number;
  razonsocial?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  ruc?: string | null;
  destipcomp?: string | null;
  codtipcomp?: string | null;
  nocomprobante?: string | null;
  base?: number | null;        // decimal? => number
  portiporet?: number | null;  // decimal? => number
  valorret?: number | null;    // decimal? => number
  idplancuentas: number;
  codigotiporet?: string | null;
  declarado: number;
  idmovbancario?: number | null;
  movbancario?: string | null;
  idsustentotrib?: number | null;
  idtipocompsri?: number | null;
  idtiporetencion?: number | null;
  idporiva?: number | null;
  porcentajeiva?: number | null; // en tu DTO es long? (12) => number
  autorizacionretencion: string;
  nestablecimiento: string;
  puntoemision: string;
  secuencial: string;
  enviado: boolean;
  tipmov: string;
}
