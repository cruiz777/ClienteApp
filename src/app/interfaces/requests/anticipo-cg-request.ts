// src/app/interfaces/requests/anticipo-cg-request.ts

export interface AnticipoDetalleRequest {
  IdDetMaestro: number;
  IdCabMaestro: number;
  numlinea: number;
  anio: string;

  // ⬇️ En Angular manejas Date
  fechatransaccion: Date;   // solo fecha (se convertirá a YYYYMMDD)
  fechaingreso: Date;       // fecha + hora (se convertirá a ISO datetime)

  hora: string;
  idZona: number;
  idLocal: number;
  idPlanCuentas: number;
  codprePc?: string | null;
  idCodContable: number;
  nocomprobante?: string | null;
  cheque?: number | null;
  beneficiario?: string | null;
  debe?: number | null;
  haber?: number | null;
  comentario?: string | null;
  idMovBancario?: number | null;
  movbancario?: string | null;
}

export interface CreateAnticipoRequest {
  // --- CABECERA ---
  IdCabMaestro: number;
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idTipoAsiento: number;
  tipdoc: string;
  numdoc: number;
  anio: string;

  // ⬇️ También Date en Angular
  fechatransaccion: Date;   // solo fecha
  fechaingreso: Date;       // fecha + hora

  observacion?: string | null;
  totdebe?: number | null;
  tothaber?: number | null;
  beneficiario?: string | null;
  modulo: number;
  id_forma_pago_cg: number;

  // --- DETALLES ---
  detalles: AnticipoDetalleRequest[];
}
