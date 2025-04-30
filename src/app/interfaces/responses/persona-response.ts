type DateOnlyString = `${number}-${number}-${number}`;

export interface PersonaResponse {
  personaCodigo: number;

  // Datos básicos
  identificacion: string;
  tipoPersona: string;
  fechaNacimiento: DateOnlyString;
  status: boolean;

  // Campos unitarios
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;

  // Relacionales (IDs para selects)
  idTipoDocumento: number;
  idEstadoCivil: number;
  idGenero: number;
  idCiudad: number;

  // Opcional: descripciones para mostrar (en tabla)
  nombresCompletos?: string;
  estadoCivil?: string;
  genero?: string;
  tipoDocumento?: string;
  ciudad?: string;

  // Estructuras completas desde backend
  correos: CorreoResponse[];
  telefonos: TelefonoResponse[];
  direcciones: DireccionResponse[];
}

export interface CorreoResponse {
  idCorreo: number;
  idPersona: number;
  tipo: string;
  email: string;
  status: boolean;
}

export interface TelefonoResponse {
  idTelefono: number;
  idPersona: number;
  tipo: string;
  numero: string;
  status: boolean;
}

export interface DireccionResponse {
  idDireccion: number;
  idPersona: number;
  tipo: string;
  calle: string;
  codigoPostal: string;
  status: boolean;
}
