export interface ListadoAsientoContableResponse {
  idCabMaestro: number;
  empresa: string | null;
  tipoAsientoCompleto: string | null;
  beneficiario: string | null;
  numdoc: number;
  totdebe: number;
  tothaber: number;
  fechatransaccion: string | Date | null;
  fechaingreso: string | Date | null;
  observacion: string | null;
  idEmpresa: number;
  estado: boolean;
}