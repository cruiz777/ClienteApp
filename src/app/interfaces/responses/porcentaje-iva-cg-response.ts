export interface PorcentajeIvaResponse {
  idPorIva: number;
  codigoIva: number;
  descripcion: string;  
  porcentaje: number;
  fechainicio: string;          // ISO del backend
  fechafin: string | null;      // puede venir null
  estado: boolean | number;
}

