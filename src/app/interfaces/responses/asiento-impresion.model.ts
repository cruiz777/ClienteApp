// Detalle (equivale a AsientoImpresionDetalleResponse)
export interface AsientoImpresionDetalle {
  local: number;
  codCuenta: string;
  nombreCuenta: string;
  auxiliar: string;
  nombreAuxiliar: string; 
  numeroCheque: string;
  numeroComprobante: string;
  debe: number;
  haber: number;
}

// Cabecera + detalles (equivale a AsientoImpresionResponse)
export interface AsientoImpresion {
  idCabMaestro: number;
  tipdoc: string;
  numdoc: number;
  anio: string;
  fechatransaccion: string;
  fechaingreso: string;
  observacion?: string | null;
  totalDebe: number;
  totalHaber: number;
  beneficiario?: string | null;
  tipoAsientoDescripcion?: string | null;
  empresaNombre?: string | null;
  empresaRuc?: string | null;
  empresaDireccion?: string | null;
  logoBase64?: string | null;

  detalles: AsientoImpresionDetalle[];
}
