export interface RetencionesResponse {
  idretencion: number;
  idempresa: number;
  idcabmaestro: number;
  numdoc: string;
  numlinea: number;
  anio: string;
  fecha: string; // ISO string (ej: "2025-12-14T14:07:56.273Z")
  hora: string;
  tipocomp: string;
  descomp: string | null;
  idcodcontable: number;
  contribuyente: string | null;
  direccion: string | null;
  telefono: string | null;
  rucci: string | null;
  idtipocompsri: number | null;
  tipocomprobante: string | null;
  tipcompvta: string | null;
  numcompvta: string | null;
  ejerfiscal: string | null;
  baseimponible: number | null;
  porcentajeretencion: number | null;
  valorretenido: number | null;
  concepto: string | null;
  idtiporetencion: number;
  codigoretencion: string | null;
  fechaing: string; // ISO string
  autretencion: string | null;
  numestablecimiento: string | null;
  puntoemision: string | null;
  secuencial: string | null;
  enviado: boolean;
  tipomovimiento: string | null;
  estadoingreso: boolean;
  idusuario:number;
}
