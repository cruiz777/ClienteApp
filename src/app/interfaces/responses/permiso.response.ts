// ---- Catálogos (combos) ----

export interface MotivoPermiso {
  idMotivoPermiso: number;
  descripcion: string;
}

export interface TipoPermiso {
  idTipoPermiso: number;
  descripcion: string;
}

export interface TipoTiempo {
  idTipoTiempo: number;
  tiempo: string;
  horas: number | null;
}

// ---- Request: crear solicitud de permiso ----
// Refleja CreatePermisoRequest del back

export interface CreatePermisoRequest {
  idEmpleadoSolicita: number;
  idMotivoPermiso: number;
  idEmpleadoAprueba: number | null;
  idEmpleadoAutoriza: number | null;
  fechaDesde: string; // ISO 8601, ej: 2026-04-18T08:00:00
  fechaHasta: string; // ISO 8601
  tiempo: string; // texto libre, ej "4:30"
  idTipoTiempo: number;
  idTipoPermiso: number;
  detalle: string | null;
  observacion: string | null;
}

// ---- Request: aprobar / rechazar / eliminar una solicitud ----
// Refleja UpdateEstadoPermisoRequest del back

export interface UpdateEstadoPermisoRequest {
  idPermiso: number;
  // Valores válidos según CK_rp_permisos_estado: "SI" (aprobado), "NO" (rechazado), "PND" (pendiente), "ELI" (eliminado)
  estadoAprobacion: 'SI' | 'NO' | 'PND' | 'ELI';
  idEmpleadoAprueba: number | null;
  idEmpleadoAutoriza: number | null;
  observacion: string | null;
}

// ---- Response: solicitud de permiso ----
// Refleja PermisoResponse del back

export interface PermisoResponse {
  idPermiso: number;
  idEmpleadoSolicita: number;
  nombreEmpleadoSolicita: string;
  idEmpleadoAutoriza: number | null;
  idEmpleadoAprueba: number | null;
  motivoPermiso: string;
  tipoPermiso: string;
  tipoTiempo: string;
  horas: number | null;
  fechaDesde: string;
  fechaHasta: string;
  tiempo: string;
  detalle: string | null;
  observacion: string | null;
  estadoAprobacion: string;
  fechaSolicitud: string;
}