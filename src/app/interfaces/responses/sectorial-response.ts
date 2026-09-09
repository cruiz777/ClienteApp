export interface SectorialResponse {
  idSectorial: number;
  estructuraOcupacional?: string | null;
  desSectorial?: string | null;
  codigoIess?: string | null;
  salarioMinimo?: number | null;
  tarifaMinima?: number | null;
  estado: boolean;
  idEmpresa: number;
}