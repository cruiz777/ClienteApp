export interface PorcentajeIvaRequest {
  idPorIva: number;
  codigoIva: number;
  descripcion: string;  
  porcentaje: number;
  fechainicio: string;          // "2025-01-01T00:00:00" o "2025-01-01"
  fechafin?: string | null;
}

