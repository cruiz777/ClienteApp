export interface CreateSectorialRequest {
  estructuraOcupacional?: string | null;
  desSectorial: string;
  codigoIess?: string | null;
  salarioMinimo?: number | null;
  tarifaMinima?: number | null;
  estado: boolean;
  idEmpresa: number;
}