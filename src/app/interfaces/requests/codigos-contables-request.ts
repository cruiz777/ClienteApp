// ✅ Tipos consolidados (sin duplicados) y con tipos correctos
export interface CodigosContablesRequest {
  IdCodContable?: number;              // opcional al crear
  Identificacionauxiliar: string;
  Nombreauxiliar: string;
  Direccionauxiliar: string;
  Telefonoauxiliar: string;
  Celularauxiliar: string;
  Emailauxiliar: string;
  Plazo: number;
  Razonsocial: string;
  ActividadComercial: string;
  Tipopersona: string;                 // '01' | '02'
  Parterelacionada: number;            // 0 | 1   (antes estaba string)
  IdPersona: number;
  IdEmpresa: number;
  IdCiudad: number;
  IdTipoContribuyente: number;
  IdUsuario: number;
  Estado: boolean;
  FechaRegistro: string;               // yyyy-MM-dd
  Nombre1: string;
  Nombre2: string;
  Apellido1: string;
  Apellido2: string;
  Tipoidentificacion: number;
}

export interface ApiResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number | null;
}
