// src/app/interfaces/requests/anticipo-cg-response.ts
export interface AnticipoDetalleResponse {
  IdDetMaestro: number;
  IdCabMaestro: number;
  numlinea: number;
  anio: string;
  fechatransaccion: string;   // viene como DateTime → string
  fechaingreso: string;       // idem
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

export interface AnticipoCgResponse {
  IdCabMaestro: number;
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idTipoAsiento: number;
  tipdoc: string;
  numdoc: number;
  anio: string;
  fechatransaccion: string;   // string (ISO en JSON)
  fechaingreso: string;       // string (ISO en JSON)
  observacion?: string | null;
  totdebe?: number | null;
  tothaber?: number | null;
  beneficiario?: string | null;
  modulo: number;
  detalles: AnticipoDetalleResponse[];
}
