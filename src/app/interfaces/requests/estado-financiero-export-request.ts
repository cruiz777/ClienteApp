import { EstadoFinancieroRequest } from "./estado-financiero-request";

export interface EstadoFinancieroExportRequest {
  request: EstadoFinancieroRequest;
  mostrarCodigos: boolean;  // true = mostrar códigos de cuenta, false = solo nombres
  tipoReporte: 'situacion-financiera' | 'resultados';  // Para futuro segundo reporte
}