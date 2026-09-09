export interface CreateRpRegimenRequest {
  descripcion: string;
  estado: boolean;
}

export interface UpdateRpRegimenRequest {
  id_regimen: number;
  descripcion: string;
  estado: boolean;
}