export interface PeriodoNominaResponse {
  periodo:           string;
  idTipoNomEsp:      number;
  tipoNomina:        string;
  idRegimen:         number | null; 
  regimen:           string | null;
  cantidadEmpleados: number;
  totalLiquido:      number;
}