export interface PeriodoNominaResponse {
  periodo:           string;
  idTipoNomEsp:      number;
  tipoNomina:        string;
  regimen:           string | null;
  cantidadEmpleados: number;
  totalLiquido:      number;
}