export interface PersonaRequest {
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  numeroDocumento: string;
  idTipoDocumento: number;
  idEstadoCivil: number;
  idGenero: number;
  idCiudad: number;
  fechaNacimiento: string;  // Formato YYYY-MM-DD
  tipoPersona: string;
  status: boolean;
  correos: CorreoRequest[];
  telefonos: TelefonoRequest[];
  direcciones: DireccionRequest[];
}

export interface CorreoRequest {
  idCorreo?: number;
  idPersona?: number;
  tipo: string;
  email: string;
  status?: boolean;
}

export interface TelefonoRequest {
  idTelefono?: number;
  idPersona?: number;
  tipo: string;
  numero: string;
  status?: boolean;
}

export interface DireccionRequest {
  idDireccion?: number;
  idPersona?: number;
  tipo: string;
  calle: string;
  codigoPostal: string;
  status?: boolean;
}

