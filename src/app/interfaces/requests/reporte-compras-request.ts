export interface PurchaseReportRequest {
  fechaInicio: Date | string;
  fechaFin: Date | string;
  idEmpresa: number;
  formato?: string; // "json" o "excel"
}