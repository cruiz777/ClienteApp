export interface InformacionFechasContribuyente {
  fechaInicioActividades: string;
  fechaCese: string;
  fechaReinicioActividades: string;
  fechaActualizacion: string;
}

export interface RucConsulta {
  numeroRuc: string;
  razonSocial: string;
  actividadEconomicaPrincipal: string;
  tipoContribuyente: string;
  estadoContribuyenteRuc: string;
  informacionFechasContribuyente: InformacionFechasContribuyente;
}

export interface RucApiResponse {
  ok: boolean;
  consulta: RucConsulta[];
}
