export interface DireccionRequest {
  idDireccion: number;
  idPersona: number;
  tipo: string;
  calle: string;
  codigoPostal?: string;
  status: boolean;
}