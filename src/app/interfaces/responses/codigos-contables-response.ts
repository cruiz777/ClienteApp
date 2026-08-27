export interface CodigosContablesResponse {
  IdCodContable: number;
  Identificacionauxiliar: string;
  Nombreauxiliar: string;
  Direccionauxiliar: string;
  Telefonoauxiliar: string;
  Celularauxiliar: string;
  Emailauxiliar: string;
  Plazo: number;
  Razonsocial: string;
  ActividadComercial: string;
  Tipopersona: string;
  Parterelacionada: number;
  IdPersona: number;
  IdEmpresa: number;
  IdCiudad: number;
  IdTipoContribuyente: number;
  IdUsuario: number;
  Estado: boolean;
  FechaRegistro: Date;
  Nombre1: string;
  Nombre2: string;
  Apellido1: string;
  Apellido2: string;
  Tipoidentificacion: number;
  EstadoRuc:boolean;
  FechaInicioAct: string | null;
}

