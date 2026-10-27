// ---- Response: saldo de vacaciones ----
// Refleja SaldoVacacionesResponse del back

export interface SaldoVacacionesResponse {
  idEmpleado: number;
  diasNormalesAcumulados: number;
  diasAdicionalesAcumulados: number;
  diasNormalesTomados: number;
  diasAdicionalesTomados: number;
  diasDisponibles: number;
}

// ---- Response: desglose de períodos (modal) ----

export interface PeriodoVacacionesResponse {
  periodo: string;
  diasNormal: number;
  diasAdicional: number;
  diasTomados: number;
  diasDisponible: number;
}

export interface PreviewSolicitudVacacionesResponse {
  textoSolicitud: string;
  textoAutorizacion: string;
}

// ---- Response: fila del listado/grid de solicitudes ----

export interface VacacionTomadaGridResponse {
  idVacacionTomada: number;
  idEmpleado: number;
  nombreEmpleado: string;
  fechaDesde: string;
  fechaHasta: string;
  fechaRetorno: string | null;
  diasTomados: number;
  periodoDesde: string | null;
  periodoHasta: string | null;
  observacion: string | null;
  personaReemplazo: string | null;
  usuarioAutoriza: string | null;
  usuarioAprueba: string | null;
  fechaSolicitud: string | null;
}

// ---- Request: editar una solicitud ya guardada ----
// Solo campos informativos — diasTomados/fechas no son editables (ver back)

export interface UpdateSolicitudVacacionesRequest {
  idVacacionTomada: number;
  observacion: string | null;
  personaReemplazo: string | null;
  usuarioAutoriza: string | null;
  usuarioAprueba: string | null;
}

// ---- Request: crear solicitud de vacaciones ----
// Refleja CreateSolicitudVacacionesRequest del back

export interface CreateSolicitudVacacionesRequest {
  idEmpleado: number;
  fechaDesde: string; // ISO 8601
  fechaHasta: string; // ISO 8601
  fechaRetorno: string; // ISO 8601
  diasSolicitados: number;
  observacion: string | null;
  personaReemplazo: string | null;
  usuarioAutoriza: string | null;
  usuarioAprueba: string | null;
}