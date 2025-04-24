type DateOnlyString = `${number}-${number}-${number}`;
export interface PersonaResponse {
  personaCodigo: number;
  identificacion?: string;
  nombresCompletos?: string;
  tipoPersona?: string;
  fechaNacimiento?: DateOnlyString;  // DateOnly se maneja como string en ISO format
  estadoCivil?: string;
  genero?: string;
  tipoDocumento?: string;
  ciudad?: string;
  status: boolean;
  correos?: string[];
  telefonos?: string[];
  direcciones?: string[];
}
