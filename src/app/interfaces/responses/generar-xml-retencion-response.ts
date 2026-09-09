export interface GenerarXmlRetencionResponse {
  success: boolean;
  message?: string | null;
  fileName?: string | null;
  savedPath?: string | null;
  claveAcceso?: string | null;
  secuencial?: string | null;
  establecimiento?: string | null;
  puntoEmision?: string | null;
  totalLineas: number;
  rucEmpresa?: string | null;
}
