export interface MovimientoMaestroResponse {
  idDetMaestro: number;
  fechaTransaccion: string;   // "2026-01-05T10:07:39"
  idMovBancario?: number | null;
  movBancario?: string | null; // "DP", "CH", etc
  noComprobante?: string | null;

  cheque?: number | null;
  debe?: number | null;
  haber?: number | null;

  beneficiario?: string | null;
  numdoc?: string | number | null;   // ✅ aquí
  tipdoc?: string | null;
}