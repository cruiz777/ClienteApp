export interface EstadoFinancieroRequest {
  fechaDesde: string;  // formato ISO: "2025-01-01T00:00:00.000Z"
  fechaHasta: string;  // formato ISO: "2025-12-31T23:59:59.999Z"
  idEmpresa: number;
  idLocal?: number | null;
  idZona?: number | null;
  idCentroCosto?: number | null;
  idProyecto?: number | null;
  idSubproyecto?: number | null;
}