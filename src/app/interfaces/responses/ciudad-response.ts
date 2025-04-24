export interface CiudadResumen {
  id: number;
  ciudad: string;
  canton: string;
  provincia: string;
  pais: string;
}

export interface ApiResponseCiudad {
  id: string;
  type: string;
  data: CiudadResumen[];
}
