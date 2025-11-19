export interface AsientoContableRequest {
  IdCabMaestro: number;
  idZona: number;
  idUsuario: number;
  idEmpresa: number;
  idTipoAsiento: number;
  tipdoc: string;
  numdoc: number;
  anio: string;
  fechatransaccion: string; // ISO string
  fechaingreso: string;     // ISO string
  observacion: string;
  totdebe: number;
  tothaber: number;
  beneficiario: string;
  cierre: string;
  fechacierre: string;      // ISO string
  solicitado: string;
  depto: string;
  autorizado: string;
  homCodigo: number;
  estado: boolean;
  detalles: DetalleAsientoRequest[];
}

export interface DetalleAsientoRequest {
  IdDetMaestro: number;
  IdCabMaestro: number;
  numlinea: number;
  anio: string;
  fechatransaccion: string; // ISO string
  hora: string;
  idZona: number;
  idCentroCostos: number;
  idLocal: number;
  idPlanCuentas: number;
  codprePc: string;
  idCodContable: number;
  nocomprobante: string;
  docurelacionado: string;
  cheque: number;
  beneficiario: string;
  debe: number;
  haber: number;
  comentario: string;
  idMovBancario: number;
  movbancario: string;
  fechaingreso: string;     // ISO string
  cierre: string;
  fechacierre: string;      // ISO string
  conciliado: string;
  fechaconciliado: string;  // ISO string
  idSustentoTrib: number;
  idTipoCompSri: number;
  autorizacion: string;
  fechacaduca: string;      // ISO string
  idTipoRetencion: number;
  idProyecto: number;
  idSubproyecto: number;
  transferido: boolean;
  fechatransferido: string; // ISO string
  fechavencimiento: string; // ISO string
  idConciliacion: number;
  valorLetras: string;
  estadoIngreso: boolean;
}

/** Opcional: fábrica de objeto con valores por defecto válidos */
export function createEmptyAsientoContableRequest(): AsientoContableRequest {
  const nowIso = new Date().toISOString();
  return {
    IdCabMaestro: 0,
    idZona: 0,
    idUsuario: 0,
    idEmpresa: 0,
    idTipoAsiento: 0,
    tipdoc: '',
    numdoc: 0,
    anio: '',
    fechatransaccion: nowIso,
    fechaingreso: nowIso,
    observacion: '',
    totdebe: 0,
    tothaber: 0,
    beneficiario: '',
    cierre: '',
    fechacierre: nowIso,
    solicitado: '',
    depto: '',
    autorizado: '',
    homCodigo: 0,
    estado: true,
    detalles: [
      {
        IdDetMaestro: 0,
        IdCabMaestro: 0,
        numlinea: 0,
        anio: '',
        fechatransaccion: nowIso,
        hora: '',
        idZona: 0,
        idCentroCostos: 0,
        idLocal: 0,
        idPlanCuentas: 0,
        codprePc: '',
        idCodContable: 0,
        nocomprobante: '',
        docurelacionado: '',
        cheque: 0,
        beneficiario: '',
        debe: 0,
        haber: 0,
        comentario: '',
        idMovBancario: 0,
        movbancario: '',
        fechaingreso: nowIso,
        cierre: '',
        fechacierre: nowIso,
        conciliado: '',
        fechaconciliado: nowIso,
        idSustentoTrib: 0,
        idTipoCompSri: 0,
        autorizacion: '',
        fechacaduca: nowIso,
        idTipoRetencion: 0,
        idProyecto: 0,
        idSubproyecto: 0,
        transferido: false,
        fechatransferido: nowIso,
        fechavencimiento: nowIso,
        idConciliacion: 0,
        valorLetras: '',
        estadoIngreso: true,
      },
    ],
  };
}
